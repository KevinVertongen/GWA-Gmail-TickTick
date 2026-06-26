// ── Cleanup completed tasks ───────────────────────────────────────────────────

function cleanupCompletedTickTickTasks() {
    const propertiesService = PropertiesService.getUserProperties();
    const properties = propertiesService.getProperties();

    const accessToken = getAccessToken()
    if (!accessToken) {
        console.error('⚠️ You are not logged in to TickTick. Please login and try again.');
        return;
    }

    let removed = 0;
    for (const key in properties) {
        // Only process messageId → `{ taskId, projectId }` mappings
        if (!key.startsWith(PROP_PREFIX_TASK)) continue;

        const {taskId, projectId} = JSON.parse(properties[key]);
        try {
            const response = UrlFetchApp.fetch(`${TICKTICK_API_BASE}/project/${projectId}/task/${taskId}`, {
                method: 'get',
                headers: {'Authorization': `Bearer ${accessToken}`},
                muteHttpExceptions: true
            });

            const status = response.getResponseCode();
            const content = response.getContentText();
            console.log(`TaskId: ${taskId} - HTTP ${status} ${content}`);

            if (status === 200) {
                if (!content) {
                    propertiesService.deleteProperty(key);
                    removed++;
                    console.info(`Removed permanently deleted task: ${taskId}`);
                    continue;
                }

                const task = JSON.parse(content);
                // TickTick status: 0 = active, 2 = completed
                if (task.status === 2) {
                    propertiesService.deleteProperty(key);
                    removed++;
                    console.info(`Removed completed task: ${taskId}`);
                }
            } else {
                console.warn(`Unexpected HTTP response for task: ${taskId} - HTTP ${status} ${content}`);
            }
        } catch (err) {
            console.error(`Error checking task ${taskId}: ${err}`);
        }
    }
    console.info(`Cleanup complete. Removed ${removed} entries.`);
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