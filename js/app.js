document.addEventListener('DOMContentLoaded', () => {
    const analyzeButton = document.getElementById('analyze-button');
    const debateTextInput = document.getElementById('debate-text');
    const analysisResultsDiv = document.getElementById('analysis-results');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageP = document.getElementById('error-message');

    // Check for API key on page load and show warning if not set
    function checkApiKeyAndShowWarning() {
        const settings = getAllSettings();
        const existingWarning = document.querySelector('.api-key-warning');
        
        if (!settings.apiKey) {
            if (!existingWarning) {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'warning api-key-warning';
                warningDiv.innerHTML = `
                    API key is not configured. Please go to <a href="settings.html" style="color: white; text-decoration: underline;">Settings</a> to set up your OpenAI API credentials.
                `;
                const main = document.querySelector('main');
                main.insertBefore(warningDiv, main.firstChild);
            }
        } else if (existingWarning) {
            existingWarning.remove();
        }
    }

    // Check API key on page load
    checkApiKeyAndShowWarning();

    analyzeButton.addEventListener('click', async () => {
        const textToAnalyze = debateTextInput.value.trim();
        const settings = getAllSettings();

        analysisResultsDiv.innerHTML = '<p>Results will appear here.</p>'; // Reset results
        errorMessageP.textContent = '';
        errorMessageP.style.display = 'none';

        if (!settings.apiKey) {
            errorMessageP.textContent = 'API Key is not set. Please configure it in the Settings page.';
            errorMessageP.style.display = 'block';
            return;
        }

        if (!textToAnalyze) {
            errorMessageP.textContent = 'Please enter some text to analyze.';
            errorMessageP.style.display = 'block';
            return;
        }

        loadingIndicator.style.display = 'block';
        analyzeButton.disabled = true;

        const systemPrompt = `You are an expert in logical fallacies, critical thinking, and debate analysis.
Analyze the provided text for any logical fallacies, factual inaccuracies, or areas of weak reasoning.
For each identified issue, please:
1. State the type of fallacy/incorrectness.
2. Quote the relevant part of the text.
3. Provide a brief explanation of why it's an issue.
If there are no significant issues, state that clearly.
Present your findings in a clear, well-structured format.`;

        try {
            const response = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                    model: settings.defaultModel,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: textToAnalyze }
                    ],
                    stream: true,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`API Error: ${response.status} - ${errorData.error?.message || errorData.message}`);
            }

            // Clear results and prepare for streaming
            analysisResultsDiv.textContent = '';

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') break;

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                                analysisResultsDiv.textContent += parsed.choices[0].delta.content;
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            if (!analysisResultsDiv.textContent.trim()) {
                analysisResultsDiv.textContent = 'No response received from API.';
            }

        } catch (error) {
            console.error('Analysis error:', error);
            errorMessageP.textContent = `Error: ${error.message}. Check console for details. Ensure your API key and Base URL are correct.`;
            errorMessageP.style.display = 'block';
            analysisResultsDiv.textContent = 'Failed to get analysis.';
        } finally {
            loadingIndicator.style.display = 'none';
            analyzeButton.disabled = false;
        }
    });
});
