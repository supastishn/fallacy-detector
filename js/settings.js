document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settings-form');
    const apiKeyInput = document.getElementById('api-key');
    const baseUrlInput = document.getElementById('base-url');
    const defaultModelInput = document.getElementById('default-model');
    const temperatureInput = document.getElementById('temperature');
    const statusMessage = document.getElementById('status-message');
    const testApiButton = document.getElementById('test-api-button');
    const testResults = document.getElementById('test-results');

    // Initialize theme
    initializeTheme();

    // Add theme toggle event listener
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Load existing settings
    apiKeyInput.value = getSetting(settingsKeys.apiKey) || '';
    baseUrlInput.value = getSetting(settingsKeys.baseUrl) || ''; // Default to empty
    defaultModelInput.value = getSetting(settingsKeys.defaultModel) || ''; // Default to empty
    temperatureInput.value = getSetting(settingsKeys.temperature) || '0.3';

    settingsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        statusMessage.textContent = '';
        statusMessage.className = '';

        const apiKey = apiKeyInput.value.trim();
        const baseUrl = baseUrlInput.value.trim();
        const defaultModel = defaultModelInput.value.trim();
        const temperature = parseFloat(temperatureInput.value);

        if (!apiKey || !baseUrl || !defaultModel) {
            statusMessage.textContent = 'API Key, Base URL, and Default Model are required.';
            statusMessage.className = 'error';
            clearStatusMessage(statusMessage);
            return;
        }

        if (isNaN(temperature) || temperature < 0 || temperature > 2) {
            statusMessage.textContent = 'Temperature must be a number between 0.0 and 2.0.';
            statusMessage.className = 'error';
            clearStatusMessage(statusMessage);
            return;
        }

        saveSetting(settingsKeys.apiKey, apiKey);
        // Remove trailing slash if it exists
        let cleanBaseUrl = baseUrl;
        if (cleanBaseUrl.endsWith('/')) {
            cleanBaseUrl = cleanBaseUrl.slice(0, -1);
        }
        saveSetting(settingsKeys.baseUrl, cleanBaseUrl);
        saveSetting(settingsKeys.defaultModel, defaultModel);
        saveSetting(settingsKeys.temperature, temperature.toString());

        statusMessage.textContent = 'Settings saved successfully! You can now return to the home page to analyze text.';
        statusMessage.className = 'success';
        clearStatusMessage(statusMessage, 5000);
    });

    // Test API button functionality
    testApiButton.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        const baseUrl = baseUrlInput.value.trim();
        const defaultModel = defaultModelInput.value.trim();
        const temperature = parseFloat(temperatureInput.value) || 0.3;

        if (!apiKey || !baseUrl || !defaultModel) {
            statusMessage.textContent = 'Please fill in API Key, Base URL, and Default Model before testing the API.';
            statusMessage.className = 'error';
            clearStatusMessage(statusMessage);
            return;
        }

        testApiButton.disabled = true;
        testApiButton.textContent = 'Testing...';
        testResults.style.display = 'block';
        testResults.innerHTML = '<div style="padding: 16px; background: rgba(102, 126, 234, 0.1); border-radius: 12px; color: #667eea;">Testing API connection...</div>';

        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: defaultModel,
                    messages: [
                        { role: "system", content: "You are a helpful assistant." },
                        { role: "user", content: "Say 'API test successful!' and nothing else." }
                    ],
                    stream: true,
                    temperature: temperature
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`API Error: ${response.status} - ${errorData.error?.message || errorData.message}`);
            }

            testResults.innerHTML = '<div style="padding: 16px; background: #f7fafc; border-radius: 12px; border: 2px solid #e2e8f0; font-family: monospace;"></div>';
            const resultDiv = testResults.querySelector('div');

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
                                resultDiv.textContent += parsed.choices[0].delta.content;
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            statusMessage.textContent = 'API test completed successfully!';
            statusMessage.className = 'success';
            clearStatusMessage(statusMessage);

        } catch (error) {
            console.error('API test error:', error);
            testResults.innerHTML = `<div style="padding: 16px; background: linear-gradient(135deg, #f56565, #e53e3e); color: white; border-radius: 12px;">API test failed: ${error.message}</div>`;
            statusMessage.textContent = 'API test failed. Check the error above.';
            statusMessage.className = 'error';
            clearStatusMessage(statusMessage);
        } finally {
            testApiButton.disabled = false;
            testApiButton.textContent = 'Test API Connection';
        }
    });
});
