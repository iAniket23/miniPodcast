document.getElementById('Play').addEventListener('click', async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractTextFromHeadingsAndParagraphs
        }, async (results) => {
            if (chrome.runtime.lastError) {
                console.error('Script execution failed:', chrome.runtime.lastError.message);
                return;
            }

            const extractedText = results[0]?.result || "No content found.";
            document.getElementById('fullText').innerText = extractedText;

            try {
                let summary = await startSession(extractedText);
                document.getElementById('summary').innerText = "Summary: " + summary;
            } catch (err) {
                console.error('Error generating summary:', err);
                document.getElementById('summary').innerText = "Summary could not be generated.";
            }
        });
    } catch (error) {
        console.error('Error querying tabs or executing script:', error);
    }
});

function extractTextFromHeadingsAndParagraphs() {
    const elements = document.querySelectorAll('p');
    const extractedTexts = Array.from(elements)
        .map(el => el.innerText.trim())
        .filter(text => text.length > 0); // Filter out empty or whitespace-only texts

    console.log("Extracted Text:", extractedTexts);
    return extractedTexts.join('\n\n'); // Separate each block of text with a new line
}

function withTimeout(promise, ms) {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms));
    return Promise.race([promise, timeout]);
}


async function startSession(fullText) {
    try {
        const { available, defaultTemperature, defaultTopK, maxTopK } = await ai.languageModel.capabilities();

        if (available === "no") {
            throw new Error("Language model is not available.");
        }
        console.log("Creating session...");
        const session = await ai.languageModel.create();
        console.log("Session created.");
        const stream = session.promptStreaming(
            "You are a Podcast script writer. Write a summary as a podcast script for the following text (The text is scraped from the webpage, make sure the text makes sense): " + fullText
        );

        console.log("Streaming prompt...");
        let summary = ''; // String to accumulate the full text
        const timeout = 30000; // Timeout set to 30 seconds

        // Use the withTimeout function to add timeout handling
        const result = await withTimeout(
            (async () => {
                for await (const chunk of stream) {
                    summary += chunk; // Append each chunk to the full text
                }
            })(),
            timeout
        );

        return summary;
    } catch (error) {
        console.error("Error in startSession:", error);
        throw error; // Rethrow error to handle it in the caller
    }
}