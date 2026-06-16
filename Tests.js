/**
 * Verify if the TickTick service has access.
 * Print the access token.
*/
function checkConnection() {
  const service = getTickTickService();
  Logger.log('Has access: ' + service.hasAccess());
  Logger.log('Access token: ' + service.getAccessToken());
}

/**
 * Test the creation of a new task in TickTick.
 */
function testCreateTask() {
  const accessToken = getAccessToken();
  Logger.log('Token: ' + accessToken);

  const task = {
    title:   'Test taak vanuit Apps Script',
    content: 'Van: test@example.com',
    priority: 0
  };

  const response = UrlFetchApp.fetch(`${TICKTICK_API_BASE}/task`, {
    method:  'post',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json'
    },
    payload:            JSON.stringify(task),
    muteHttpExceptions: true
  });

  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Response: ' + response.getContentText());
}
