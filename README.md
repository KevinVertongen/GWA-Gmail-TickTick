# Gmail TickTick addon 

Google Workspace Add-on for Gmail to create [TickTick](https://ticktick.com/) tasks from e-mails.

## Set up the OAuth flow

To authenticate against the OAuth2 provider of TickTick register your add-on at [developer.ticktick.com](https://developer.ticktick.com/manage) and obtain a client ID and secret.
To get your Apps Script "Redirect URI" run the `printRedirectUri()` function provided in the script.

The URL will always be in the following format: `https://script.google.com/macros/d/{SCRIPT ID}/usercallback`.
Where `{SCRIPT ID}` is the ID of your Apps Script, found in your "Project properties".
