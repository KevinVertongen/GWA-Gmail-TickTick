// ─── Constants ────────────────────────────────────────────────────────────────

const TICKTICK_API_BASE       = 'https://ticktick.com/open/v1';
const TICKTICK_AUTH_URL       = 'https://ticktick.com/oauth/authorize';
const TICKTICK_TOKEN_URL      = 'https://ticktick.com/oauth/token';
const TICKTICK_TASK_URL       = 'https://ticktick.com/webapp/#p/inbox/tasks';

const PROP_KEY_CLIENT_ID      = 'TICKTICK_CLIENT_ID';
const PROP_KEY_CLIENT_SECRET  = 'TICKTICK_CLIENT_SECRET';
const PROP_KEY_PROJECT        = 'TICKTICK_PROJECT_ID';
const PROP_KEY_REMINDER       = 'TICKTICK_DEFAULT_REMINDER';
const PROP_PREFIX_TASK        = 'task_';

const GWA_CARD_TITLE          = 'Send to TickTick';
const GWA_CARD_ICON           = 'https://www.gstatic.com/images/icons/material/system/1x/check_circle_black_48dp.png';

// ─── OAuth2 Flow ────────────────────────────────────────────────────────────

/**
 * Configure and return the OAuth2 service.
 * The library manages tokens, refresh and callback.
 */
function getTickTickService_() {
  return OAuth2.createService('TickTick')
    .setAuthorizationBaseUrl(TICKTICK_AUTH_URL)
    .setTokenUrl(TICKTICK_TOKEN_URL)
    .setClientId(getClientId())
    .setClientSecret(getClientSecret())
    .setCallbackFunction('authCallback')
    .setScope('tasks:read tasks:write')
    .setTokenHeaders({
      'Authorization': 'Basic ' + getCredentials()
    })
    .setPropertyStore(PropertiesService.getUserProperties())
    .setCache(CacheService.getUserCache())
    .setLock(LockService.getUserLock())
    .setParam('login_hint', Session.getEffectiveUser().getEmail());
}

/**
 * Step 1 — Run this function, then open the logged URL in your browser.
 * It will redirect you to TickTick's login + consent screen.
 */
function startTickTickOAuth() {
  const service = getTickTickService_();

  if (service.hasAccess()) {
    Logger.log('✅ Already authorized with TickTick.');
    return;
  }

  const authUrl = service.getAuthorizationUrl();
  Logger.log('Open this URL in your browser:\n\n' + authUrl);
}

/**
 * Step 2 — Apps Script calls this automatically when TickTick redirects back.
 * It exchanges the authorization code for an access + refresh token.
 */
function authCallback(request) {
  const service      = getTickTickService_();
  const isAuthorized = service.handleCallback(request);

  if (isAuthorized) {
    return HtmlService.createHtmlOutput(`
   	  <h2>✅ Connected to TickTick!</h2>
      <p>You can close this tab and return to Gmail.</p>
   `);
  } else {
    return HtmlService.createHtmlOutput(
      '<h2>❌ Failed to connect to TickTick. Close this tab and try again.</h2>'
    );
  }
}

/**
 * Returns a valid access token, refreshing it first if it's expired.
 */
function getAccessToken() {
  const service = getTickTickService_();

  if (!service.hasAccess()) {
    Logger.log('⚠️ Not connected — execute startTickTickOAuth() before continuing.');
    return null;
  }

  return service.getAccessToken();
}

// ─── OAuth2 helpers ────────────────────────────────────────────────────────────

function getClientId() {
  const clientId = getUserProperty(PROP_KEY_CLIENT_ID);
  if (!clientId) Logger.log('⚠️ TickTick client ID not set.');
  return clientId
}

function getClientSecret() {
  const clientSecret = getUserProperty(PROP_KEY_CLIENT_SECRET);
  if (!clientSecret) Logger.log('⚠️ TickTick client secret not set.');
  return clientSecret
}

// Base64 encoded client ID and client secret.
function getCredentials() {
  const clientId = getClientId()
  const clientSecret = getClientSecret()

  return Utilities.base64Encode(
    `${clientId}:${clientSecret}`
  );
}

// ─── Entry points ─────────────────────────────────────────────────────────────

/**
 * Renders a fallback homepage card when no email is open.
 */
function onHomepage() {
  return buildConfigCard('No message selected', 'Open an email to create a TickTick task from it.');
}

/**
 * Contextual trigger — fires whenever a Gmail message is opened.
 * @param {Object} e - The action event object provided by Gmail.
 * @returns {Card}
 */
function onGmailMessageOpen(e) {
  const messageId = e.gmail.messageId;

  // Activate the temporary scope to read the current message
  const accessToken = e.gmail.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  const message = GmailApp.getMessageById(messageId);
  const subject = message.getSubject() || '(no subject)';
  const sender  = message.getFrom();
  const emailDate    = message.getDate();
  const timeZone = e.commonEventObject.timeZone;  // The user's timezone ID and offset
  const messageUrl = message.getThread().getPermalink();
  const bodyPlain  = message.getPlainBody().substring(0, 1000).trim();

  return buildTaskCard(messageId, subject, sender, emailDate, timeZone, messageUrl, bodyPlain);
}

// ─── Card builders ────────────────────────────────────────────────────────────

/**
 * Builds the main sidebar card showing email info + action button.
 */
function buildTaskCard(messageId, subject, sender, emailDate, timeZone, messageUrl, bodyPlain) {

  // ── If a task was already created, show its link ───────────────
  const existingTaskId = getTaskIdProperty(`messageId`);
  if (existingTaskId) {
    return buildTaskLinkCard(existingTaskId);
  }

  // ── No existing task found, show new task form ─────────────────
  const defaultContent =
      `From: ${sender}\n` +
      `Link: ${messageUrl}\n` +
      `---\n${bodyPlain}`;

  // ── Editable fields ───────────────────────────────────────────
  const inputSection = CardService.newCardSection()
      .setHeader('Task details')
      .addWidget(
          CardService.newTextInput()
              .setFieldName('taskTitle')
              .setTitle('Title')
              .setValue(subject)
      )
      .addWidget(
          CardService.newTextInput()
              .setFieldName('taskContent')
              .setTitle('Notes')
              .setValue(defaultContent)
              .setMultiline(true)
      );

  // ── Project dropdown ──────────────────────────────────────────
  const projectSelector = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('projectId')
      .setTitle('Project');

  projectSelector.addItem('📥 Inbox', '', true); // default

  const projects = getTickTickProjects();
  projects.forEach(p => {
    projectSelector.addItem(p.name, p.id, false);
  });

  inputSection.addWidget(projectSelector);

  // ── Due date ──────────────────────────────────────────────────
  const dueDate   = new Date();
  dueDate.setDate(dueDate.getDate() + 1); // Set due date to 'tomorrow'

  const datePicker  = CardService.newDatePicker()
      .setFieldName('dueDate')
      .setTitle('Due date')
      .setValueInMsSinceEpoch(dueDate.getTime());

  inputSection.addWidget(datePicker);

  // ── Priority ──────────────────────────────────────────────────
  const prioritySelector = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('priority')
      .setTitle('Priority')
      .addItem('None',   '0', true)
      .addItem('Low',    '1', false)
      .addItem('Medium', '3', false)
      .addItem('High',   '5', false);

  inputSection.addWidget(prioritySelector);

  // ── Action button ─────────────────────────────────────────────
  const actionSection = CardService.newCardSection()
      .addWidget(
          CardService.newTextButton()
              .setText('➕ Create TickTick Task')
              .setOnClickAction(
                  CardService.newAction()
                      .setFunctionName('createTickTickTask')
                      .setParameters({
                        messageId : messageId,
                        timeZone  : JSON.stringify(timeZone)
                      })
              )
      );

  return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
              .setTitle(GWA_CARD_TITLE)
              .setSubtitle('Create a task from this email')
              .setImageUrl(GWA_CARD_ICON)
      )
      .addSection(inputSection)
      .addSection(actionSection)
      .build();
}

/**
 * Message already has a task, show link to that task.
 * @param {String} taskId - The existing task ID.
 * @returns {Card}
 */
function buildTaskLinkCard(taskId) {
  const taskUrl = `${TICKTICK_TASK_URL}/tasks/${taskId}`;

  return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
          .setTitle(GWA_CARD_TITLE)
          .setSubtitle('Task already created')
          .setImageUrl(GWA_CARD_ICON)
      )
      .addSection(
          CardService.newCardSection()
              .addWidget(CardService.newTextParagraph()
                  .setText('✅ A TickTick task already exists for this email.'))
              .addWidget(CardService.newTextButton()
                  .setText('Open in TickTick')
                  .setOpenLink(CardService.newOpenLink().setUrl(taskUrl)))
      )
      .build();
}

/**
 * Fallback / config card.
 */
function buildConfigCard(subtitle, message) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
        .setTitle(GWA_CARD_TITLE)
        .setSubtitle(subtitle)
        .setImageUrl(GWA_CARD_ICON)
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(message))
    )
    .build();
}

// ─── TickTick integration ──────────────────────────────────────────────────────

/**
 * Callback triggered when the user clicks "Create TickTick Task".
 * Reads parameters from the action event and calls the TickTick REST API.
 * @param {Object} e - The action event object.
 * @returns {ActionResponse}
 */
function createTickTickTask(e) {
  const accessToken = getAccessToken()
  if (!accessToken) {
    return notifyUser('⚠️ You are not logged in to TickTick. Please login and try again.');
  }

  // Read form inputs — these come from e.formInput, not e.parameters
  const title     = e.formInput.taskTitle;
  const content   = e.formInput.taskContent;
  const projectId = e.formInput.projectId;   // empty string = Inbox
  const priority  = parseInt(e.formInput.priority, 10);

  // TickTick requires the user's time zone
  const timeZone = JSON.parse(e.parameters.timeZone);
  const timeZoneId = timeZone.id;
  const timezoneOffset = timeZone.offset;

  // DatePicker
  const dueDateMs   = e.formInput.dueDate?.msSinceEpoch;
  const dueDate     = dueDateMs
      ? formatDueDate(dueDateMs, parseInt(timezoneOffset, 10)) // a full ISO 8601 timestamp
      : null;

  const defaultReminder = getUserProperty(PROP_KEY_REMINDER) || 'TRIGGER:P0DT9H0M0S'; // On the day (9:00)

  const task = {
    title:    title,
    content:  content,
    priority: priority,
    isAllDay: true,
    timeZone: timeZoneId,
    reminders: [defaultReminder]
  };

  if (projectId) task.projectId = projectId;
  if (dueDate)   task.dueDate   = dueDate;
  // console.log('Task payload:', JSON.stringify(task));

  try {
    const response = UrlFetchApp.fetch(`${TICKTICK_API_BASE}/task`, {
      method:  'post',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json'
      },
      payload: JSON.stringify(task),
      muteHttpExceptions: true
    });

    const status = response.getResponseCode();
    if (status === 200 || status === 201) {
      // Store messageId → taskId mapping
      PropertiesService.getUserProperties()
          .setProperty(PROP_PREFIX_TASK + messageId, createdTask.id);

      return notifyUser('✅ Task created in TickTick!');
    } else {
      Logger.log('TickTick error: ' + status + ' ' + response.getContentText());
      return notifyUser(`❌ Failed (HTTP ${status}). Check logs.`);
    }

  } catch (err) {
    Logger.log('Fetch error: ' + err);
    return notifyUser('❌ Network error. Check logs.');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function notifyUser(message) {
  return CardService.newActionResponseBuilder()
      .setNotification(
          CardService.newNotification().setText(message)
      )
      .build();
}

function getTickTickProjects() {
  const accessToken = getAccessToken();
  if (!accessToken) return [];

  const response = UrlFetchApp.fetch(`${TICKTICK_API_BASE}/project`, {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) return [];

  return JSON.parse(response.getContentText());
}

function formatDueDate(msSinceEpoch, timezoneOffsetMs) {
  const date = new Date(parseInt(msSinceEpoch, 10));

  // Convert offset from ms to ±HH:mm string
  const totalMinutes = timezoneOffsetMs / 60000;
  const sign         = totalMinutes >= 0 ? '+' : '-';
  const absMinutes   = Math.abs(totalMinutes);
  const hours        = String(Math.floor(absMinutes / 60)).padStart(2, '0');
  const minutes      = String(absMinutes % 60).padStart(2, '0');
  const offsetString = `${sign}${hours}${minutes}`;  // e.g. "+0200"

  // Format as yyyy-MM-ddTHH:mm:ss±HHmm
  return date.toISOString().replace('.000Z', offsetString);
}

function getUserProperty(key) {
  return PropertiesService.getUserProperties().getProperty(key);
}

function getTaskIdProperty(messageId) {
  return PropertiesService.getUserProperties().getProperty(PROP_PREFIX_TASK + messageId);
}
