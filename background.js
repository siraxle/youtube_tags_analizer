chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Tags Analyzer extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeGoogleTrends') {
        // Execute the Python script
        const process = new Promise((resolve, reject) => {
            chrome.runtime.getPackageDirectoryEntry(function(root) {
                root.getFile('google_trends_app.py', {}, function(fileEntry) {
                    fileEntry.file(function(file) {
                        const reader = new FileReader();
                        reader.onloadend = function(e) {
                            // Use chrome.runtime.getURL to get the path to the Python script
                            const pythonPath = chrome.runtime.getURL('google_trends_app.py');
                            
                            // Execute Python script with the data
                            chrome.runtime.sendNativeMessage(
                                'com.youtube.tags.analyzer',
                                {
                                    script: pythonPath,
                                    args: ['--json'],
                                    input: request.data
                                },
                                function(response) {
                                    if (response.error) {
                                        reject(response.error);
                                    } else {
                                        resolve(response.result);
                                    }
                                }
                            );
                        };
                        reader.readAsText(file);
                    });
                });
            });
        });

        process.then(
            result => sendResponse({ result }),
            error => sendResponse({ error: error.toString() })
        );

        return true; // Will respond asynchronously
    }
}); 