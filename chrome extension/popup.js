// This script is executed when the popup is opened


// Event listener for the Play button
document.getElementById('Play').addEventListener('click', async () => {
    try {
        // Get the active tab in the current window
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Execute the content script to extract text from the headings and paragraphs
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractWebText
        }, async (results) => {
            if (chrome.runtime.lastError) {
                console.error('Script execution failed:', chrome.runtime.lastError.message);
                return;
            }

            const extractedText = results[0]?.result || "No content found.";
            document.getElementById('fullText').innerText = extractedText;
            console.log('Going to summarize:');
            // summarize the extracted text using the Gemini summarizer
            const summary = await gemini_summarizer(extractedText);
            document.getElementById('summary').innerText = summary;

            // Generate a podcast script based on the summary
            const podcastScript = await podcast_gemini_script(summary);
            document.getElementById('pc').innerText = podcastScript;

        });
    } catch (error) {
        console.error('Error querying tabs or executing script:', error);
    }
});

// Function to extract text from the headings and paragraphs on the page
function extractWebText() {
    const elements = document.querySelectorAll('p');
    const extractedTexts = Array.from(elements)
        .map(el => el.innerText.trim())
        .filter(text => text.length > 0) // Filter out empty or whitespace-only texts
        .join(' ') // Combine all text into a single string with spaces between paragraphs
        .split(/\s+/); // Split by whitespace to get an array of words

    const limitedText = extractedTexts.slice(0, 250).join(' '); // Take the first 250 words and join them into a string
    return limitedText;
}

async function gemini_summarizer(text) {
    try {
        const canSummarize = await ai.summarizer.capabilities();
        let summarizer;
        if (canSummarize && canSummarize.available !== 'no') {
            if (canSummarize.available === 'readily') {
                // The summarizer can immediately be used.
                summarizer = await ai.summarizer.create();
            } else {
                // The summarizer can be used after the model download.
                console.log('Downloading the summarizer model...');
                summarizer = await ai.summarizer.create();
                summarizer.addEventListener('downloadprogress', (e) => {
                    console.log(`Download Progress: ${e.loaded} / ${e.total}`);
                });
                await summarizer.ready;
            }
            const summary = await summarizer.summarize(text);
            console.log('Summary:', summary);
            summarizer.destroy();
            return summary;
        } else {
            console.log('Summarizer is not available.');

        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function podcast_gemini_script (text) {
    try {
        console.log('Generating podcast script...');
        // Start by checking if it's possible to create a session based on the
        // availability of the model and the characteristics of the device.
        const { available, defaultTemperature, defaultTopK, maxTopK } = await ai.languageModel.capabilities();

        if (available !== "no") {
            const session = await ai.languageModel.create();
            console.log('Session created');
            // Prompt the model and wait for the whole result to come back.
            // const result = await session.prompt("write a two person conversation script that summarizes the following text (very casually including ummm and filler words: )" + text);
            // use promptStreaming
            const stream = session.promptStreaming("write a very short two person conversation script that talks about following text (very casually including ummms and filler words: )" + text);
            let fullText = '';
            for await (const chunk of stream) {
                console.log(chunk);
                fullText += chunk;
            }
            session.destroy();
            return fullText;
        } else {
            console.warn("Language model is not available.");
        }
    } catch (error) {
        console.error("Error interacting with the language model:", error);
    }
}