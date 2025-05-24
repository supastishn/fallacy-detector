document.addEventListener('DOMContentLoaded', () => {
    const analyzeButton = document.getElementById('analyze-button');
    const debateTextInput = document.getElementById('debate-text');
    const analysisResultsDiv = document.getElementById('analysis-results');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageP = document.getElementById('error-message');

    // Initialize theme
    initializeTheme();

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

    // Function to process fallacy markup and create interactive display
    function processFallacyMarkup(text, container) {
        // Check if the text contains fallacy markup
        if (!text.includes('<fallacy')) {
            container.innerHTML = `<div style="padding: 16px; background: var(--success-bg); border-radius: 12px; color: var(--success-text); border: 2px solid var(--success-border); margin-bottom: 20px;">
                <strong>✅ No fallacies detected!</strong><br>
                The analysis did not identify any logical fallacies or reasoning issues in the provided text.
            </div>
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 12px; border: 2px solid var(--border-color); line-height: 1.8; color: var(--text-primary);">
                ${text.replace(/\n/g, '<br>')}
            </div>`;
            return;
        }

        // Parse fallacies from the text
        const fallacyRegex = /<fallacy type="([^"]*)" explanation="([^"]*)">(.*?)<\/fallacy>/gs;
        let match;
        let processedText = text;
        let fallacyCount = 0;
        const fallacies = [];

        // Reset regex index
        fallacyRegex.lastIndex = 0;

        // Extract fallacies and replace with highlighted spans
        while ((match = fallacyRegex.exec(text)) !== null) {
            const [fullMatch, type, explanation, content] = match;
            fallacyCount++;
            const fallacyId = `fallacy-${fallacyCount}`;
            
            fallacies.push({
                id: fallacyId,
                type: type,
                explanation: explanation,
                content: content
            });

            // Replace the XML with a highlighted span (escape HTML in attributes)
            const escapedType = type.replace(/"/g, '&quot;');
            const escapedExplanation = explanation.replace(/"/g, '&quot;');
            processedText = processedText.replace(fullMatch, 
                `<span class="fallacy-highlight" data-fallacy-id="${fallacyId}" data-type="${escapedType}" data-explanation="${escapedExplanation}">${content}</span>`
            );
        }

        // Create the display with fallacy summary and highlighted text
        let fallacySummary = '';
        if (fallacies.length > 0) {
            fallacySummary = `<div style="background: var(--error-bg); padding: 16px; border-radius: 12px; color: var(--error-text); border: 2px solid var(--error-border); margin-bottom: 20px;">
                <strong>⚠️ ${fallacies.length} fallac${fallacies.length === 1 ? 'y' : 'ies'} detected!</strong><br>
                Click on the highlighted text below to see explanations.
            </div>`;
        }

        container.innerHTML = fallacySummary + `<div style="background: var(--bg-secondary); padding: 16px; border-radius: 12px; border: 2px solid var(--border-color); line-height: 1.8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: var(--text-primary);">${processedText.replace(/\n/g, '<br>')}</div>`;

        // Add click events to highlighted fallacies
        container.querySelectorAll('.fallacy-highlight').forEach(element => {
            element.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                const explanation = this.getAttribute('data-explanation');
                showFallacyTooltip(this, type, explanation);
            });
        });
    }

    // Function to show fallacy tooltip
    function showFallacyTooltip(element, type, explanation) {
        // Remove any existing tooltips
        const existingTooltip = document.querySelector('.fallacy-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'fallacy-tooltip';
        tooltip.innerHTML = `
            <div style="font-weight: bold; color: var(--error-text); margin-bottom: 8px;">${type}</div>
            <div style="color: var(--text-primary);">${explanation}</div>
            <div style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">Click anywhere to close</div>
        `;

        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.position = 'absolute';
        tooltip.style.top = (rect.bottom + window.scrollY + 10) + 'px';
        tooltip.style.left = rect.left + 'px';
        tooltip.style.background = 'var(--bg-primary)';
        tooltip.style.border = '2px solid var(--error-border)';
        tooltip.style.borderRadius = '8px';
        tooltip.style.padding = '12px';
        tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        tooltip.style.zIndex = '1000';
        tooltip.style.maxWidth = '300px';
        tooltip.style.fontSize = '14px';

        document.body.appendChild(tooltip);

        // Close tooltip when clicking anywhere
        const closeTooltip = () => {
            tooltip.remove();
            document.removeEventListener('click', closeTooltip);
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeTooltip);
        }, 100);
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

IMPORTANT: You must return the COMPLETE, ENTIRE original text with fallacies marked up in XML tags. Do not summarize, paraphrase, or shorten any part of the text.

For each identified issue, wrap ONLY the problematic portion in XML tags with this format:
<fallacy type="[fallacy_name]" explanation="[brief explanation of why this is problematic]">[the exact problematic text]</fallacy>

Examples:
- Original: "You're clearly an idiot, so your argument is wrong."
- Marked up: "<fallacy type="Ad Hominem" explanation="Attacking the person rather than addressing their argument">You're clearly an idiot</fallacy>, so your argument is wrong."

- Original: "So you think we should just let criminals run free?"
- Marked up: "<fallacy type="Straw Man" explanation="Misrepresenting the opponent's position to make it easier to attack">So you think we should just let criminals run free?</fallacy>"

Return the complete original text with fallacies wrapped in XML tags. Preserve all formatting, punctuation, and structure. If there are no fallacies, return the original text exactly as provided.`;

        try {
            const response = await fetch(`${settings.baseUrl}/chat/completions`, {
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
                    temperature: settings.temperature
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`API Error: ${response.status} - ${errorData.error?.message || errorData.message}`);
            }

            // Clear results and prepare for streaming
            analysisResultsDiv.innerHTML = '<div style="background: #f8f9fa; padding: 16px; border-radius: 12px; border: 2px solid #e2e8f0; font-family: monospace; white-space: pre-wrap; min-height: 80px;"></div>';
            const streamingDiv = analysisResultsDiv.querySelector('div');
            let fullResponse = '';

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
                                const content = parsed.choices[0].delta.content;
                                fullResponse += content;
                                streamingDiv.textContent = fullResponse;
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            if (!fullResponse.trim()) {
                analysisResultsDiv.innerHTML = '<p>No response received from API.</p>';
            } else {
                // Add a small delay to let users see the complete XML, then process it
                setTimeout(() => {
                    processFallacyMarkup(fullResponse, analysisResultsDiv);
                }, 1000);
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
