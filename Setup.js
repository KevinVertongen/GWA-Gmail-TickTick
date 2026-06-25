
function setUserProperties() {
  userProperties.setProperty('TICKTICK_PROJECT_ID',       'your-default-project-id-here');
  userProperties.setProperty('TICKTICK_DEFAULT_REMINDER', 'your-default-iCal-reminder-here');
  Logger.log('✅ TickTick user properties set.');
}
/**
 * Fill-out the client id and client secret in the user properties store.
 */
function setOAuthProperties() {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('TICKTICK_CLIENT_ID',     'your-client-id-here');
  userProperties.setProperty('TICKTICK_CLIENT_SECRET', 'your-client-secret-here');
  Logger.log('✅ TickTick client id and secret set.');
}

/**
 * Log the redirect URI used in the TickTick developer console.
 */
function printRedirectUri() {
  Logger.log('Redirect URI voor TickTick developer console:');
  Logger.log(OAuth2.getRedirectUri());
}
