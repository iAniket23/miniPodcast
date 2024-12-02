async function startSession() {
    // Start by checking if it's possible to create a session based on the availability of the model, and the characteristics of the device.
    const { available, defaultTemperature, defaultTopK, maxTopK } = await ai.languageModel.capabilities();

    if (available !== "no") {
        const session = await ai.languageModel.create();

        // Prompt the model and stream the result:
        const stream = session.promptStreaming("Write me a haiku");

        let fullText = ''; // String to accumulate the full text

        for await (const chunk of stream) {
            console.log(chunk);
            fullText += chunk; // Append each chunk to the full text
        }

        // Wait for user interaction before speaking the text
        const speakButton = document.getElementById("speakButton");
        speakButton.addEventListener("click", () => {
            const utterance = new SpeechSynthesisUtterance(fullText);
            utterance.voice = speechSynthesis.getVoices()[0]; // You can choose the voice
            window.speechSynthesis.speak(utterance);

        });
    }
}

// Trigger the session when the page is loaded
document.addEventListener("DOMContentLoaded", () => {
    startSession();
});
