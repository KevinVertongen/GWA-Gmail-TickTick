// ── Cleanup completed tasks ───────────────────────────────────────────────────

function cleanupCompletedTickTickTasks() {
    const propertiesService = PropertiesService.getUserProperties();
    const properties = propertiesService.getProperties();

    const accessToken = getAccessToken()
    if (!accessToken) {
        return notifyUser('⚠️ You are not logged in to TickTick. Please login and try again.');
    }

    let removed = 0;
    for (const key in properties) {
        // Only process our messageId → taskId entries
        if (!key.startsWith(PROP_PREFIX_TASK)) continue;

        const taskId = properties[key];
        try {
            const response = UrlFetchApp.fetch(`${TICKTICK_API_BASE}/task/${taskId}`, {
                method: 'get',
                headers: {'Authorization': `Bearer ${accessToken}`},
                muteHttpExceptions: true
            });

            if (response.getResponseCode() === 200) {
                const task = JSON.parse(response.getContentText());
                // TickTick status: 0 = active, 2 = completed
                if (task.status === 2) {
                    propertiesService.deleteProperty(key);
                    removed++;
                    console.log(`Removed completed task: ${taskId}`);
                }
            } else if (response.getResponseCode() === 404) {
                // Task no longer exists in TickTick — clean it up too
                propertiesService.deleteProperty(key);
                removed++;
                console.log(`Removed deleted task: ${taskId}`);
            }
        } catch (err) {
            console.log(`Error checking task ${taskId}: ${err}`);
        }
    }
    console.log(`Cleanup complete. Removed ${removed} entries.`);
}

// ── Weekly cleanup trigger (run once to install) ──────────────────────────────

function createCleanupTrigger() {
    ScriptApp.newTrigger('cleanupCompletedTickTickTasks')
        .timeBased()
        .everyWeeks(1)
        .onWeekDay(ScriptApp.WeekDay.MONDAY)
        .atHour(6)
        .create();
}