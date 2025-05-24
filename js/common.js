const settingsKeys = {
    apiKey: 'openai_api_key',
    baseUrl: 'openai_base_url',
    defaultModel: 'openai_default_model',
    temperature: 'openai_temperature'
};

function saveSetting(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        console.error("Error saving to localStorage:", e);
        return false;
    }
}

function getSetting(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.error("Error reading from localStorage:", e);
        return null;
    }
}

function getAllSettings() {
    return {
        apiKey: getSetting(settingsKeys.apiKey),
        baseUrl: getSetting(settingsKeys.baseUrl) || 'https://api.openai.com', // Default base URL
        defaultModel: getSetting(settingsKeys.defaultModel) || 'gpt-3.5-turbo', // Default model
        temperature: parseFloat(getSetting(settingsKeys.temperature)) || 0.3 // Default temperature
    };
}

function clearStatusMessage(statusElement, delay = 3000) {
    if (statusElement) {
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = '';
        }, delay);
    }
}
