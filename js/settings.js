document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settings-form');
    const apiKeyInput = document.getElementById('api-key');
    const baseUrlInput = document.getElementById('base-url');
    const defaultModelInput = document.getElementById('default-model');
    const statusMessage = document.getElementById('status-message');
    const testApiButton = document.getElementById('test-api-button');
    const testResults = document.getElementById('test-results');

    // Load existing settings
    apiKeyInput.value = getSetting(settingsKeys.apiKey) || '';
    baseUrlInput.value = getSetting(settingsKeys.baseUrl) || 'https://api.openai.com';
    defaultModelInput.value = getSetting(settingsKeys.defaultModel) || 'gpt-3.5-turbo';

    settingsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        statusMessage.textContent = '';
        statusMessage.className = '';

        const apiKey = apiKeyInput.value.trim();
        const baseUrl = baseUrlInput.value.trim();
        const defaultModel = defaultModelInput.value.trim();

        if (!apiKey || !baseUrl || !defaultModel) {
            statusMessage.textContent = 'All fields are required.';
            statusMessage.className = 'error';
            clearStatusMessage(statusMessage);
            return;
        }

        saveSetting(settingsKeys.apiKey, apiKey);
        saveSetting(settingsKeys.baseUrl, baseUrl);
        saveSetting(settingsKeys.defaultModel, defaultModel);

        statusMessage.textContent = 'Settings saved successfully! You can now return to the home page to analyze text.';
        statusMessage.className = 'success';
        clearStatusMessage(statusMessage, 5000);
    });

    // Test API button functionality
    testApiButton.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        const baseUrl = baseUrlInput.value.trim();
        const defaultModel = defaultModelInput.value.trim();

        if (!apiKey || !baseUrl || !defaultModel) {
            statusMessage.textContent = 'Please fill in all fields before testing the API.';
            statusMessage.className = 'error';
            clearStatusMessage(statusMessage);
            return;
        }

        testApiButton.disabled = true;
        testApiButton.textContent = 'Testing...';
        testResults.style.display = 'block';
        testResults.innerHTML = '<div style="padding: 16px; background: rgba(102, 126, 234, 0.1); border-radius: 12px; color: #667eea;">Testing API connection...</div>';

        try {
            const response = await fetch(`${baseUrl}/v1/chat/completions`, {
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
                    temperature: 0.3
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
