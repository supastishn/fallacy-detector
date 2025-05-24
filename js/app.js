document.addEventListener('DOMContentLoaded', () => {
    const analyzeButton = document.getElementById('analyze-button');
    const debateTextInput = document.getElementById('debate-text');
    const analysisResultsDiv = document.getElementById('analysis-results');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageP = document.getElementById('error-message');
    const contextUpload = document.getElementById('context-upload');
    const contextText = document.getElementById('context-text');
    const textImageUpload = document.getElementById('text-image-upload');
    const textFileUpload = document.getElementById('text-file-upload');
    const contextImageUpload = document.getElementById('context-image-upload');
    const suggestImprovements = document.getElementById('suggest-improvements');

    // Input type selectors
    const analysisTypeRadios = document.querySelectorAll('input[name="analysis-type"]');
    const contextTypeRadios = document.querySelectorAll('input[name="context-type"]');

    // Input sections
    const analysisTextInput = document.getElementById('analysis-text-input');
    const analysisImageInput = document.getElementById('analysis-image-input');
    const analysisFileInput = document.getElementById('analysis-file-input');
    const contextTextInput = document.getElementById('context-text-input');
    const contextImageInput = document.getElementById('context-image-input');
    const contextFileInput = document.getElementById('context-file-input');

    // Initialize theme
    initializeTheme();

    // Add theme toggle event listener
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Handle analysis input type selection
    analysisTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            // Hide all analysis input sections
            analysisTextInput.style.display = 'none';
            analysisImageInput.style.display = 'none';
            analysisFileInput.style.display = 'none';
            
            // Show selected section
            switch (radio.value) {
                case 'text':
                    analysisTextInput.style.display = 'block';
                    break;
                case 'image':
                    analysisImageInput.style.display = 'block';
                    break;
                case 'file':
                    analysisFileInput.style.display = 'block';
                    break;
            }
        });
    });

    // Handle context input type selection
    contextTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            // Hide all context input sections
            contextTextInput.style.display = 'none';
            contextImageInput.style.display = 'none';
            contextFileInput.style.display = 'none';
            
            // Show selected section
            switch (radio.value) {
                case 'text':
                    contextTextInput.style.display = 'block';
                    break;
                case 'image':
                    contextImageInput.style.display = 'block';
                    break;
                case 'file':
                    contextFileInput.style.display = 'block';
                    break;
                case 'none':
                default:
                    // All sections remain hidden
                    break;
            }
        });
    });

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

    // Function to read uploaded file as text
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Function to read image file as base64
    function readImageAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result.split(',')[1]; // Remove data:image/...;base64, prefix
                resolve(base64);
            };
            reader.onerror = (e) => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(file);
        });
    }

    // Function to process diff markup and create colored display
    function processDiffMarkup(text) {
        // Process removed text (red background)
        let processedText = text.replace(
            /<removed>(.*?)<\/removed>/gs,
            '<span style="background-color: #ffeaea; color: #d63031; text-decoration: line-through; padding: 2px 4px; border-radius: 3px;">$1</span>'
        );
        
        // Process added text (green background)
        processedText = processedText.replace(
            /<added>(.*?)<\/added>/gs,
            '<span style="background-color: #eafaf1; color: #00b894; font-weight: 500; padding: 2px 4px; border-radius: 3px;">$1</span>'
        );
        
        return processedText.replace(/\n/g, '<br>');
    }

    // Function to apply diff changes and return clean text
    function applyDiffChanges(diffText) {
        try {
            // Remove <removed> sections entirely
            let cleanText = diffText.replace(/<removed>.*?<\/removed>/gs, '');
            
            // Extract content from <added> sections
            cleanText = cleanText.replace(/<added>(.*?)<\/added>/gs, '$1');
            
            // Clean up any extra whitespace
            cleanText = cleanText.replace(/\s+/g, ' ').trim();
            
            return cleanText;
        } catch (error) {
            console.error('Error applying diff changes:', error);
            alert('Error applying changes. Please copy the text manually.');
            return null;
        }
    }

    // Function to process analysis response with fallacies and suggestions
    function processAnalysisResponse(text, container) {
        // Split the response into sections
        const improvementsSplit = text.split('SUGGESTED IMPROVEMENTS:');
        const fallacyText = improvementsSplit[0].trim();
        
        let suggestionsText = '';
        let revisedText = '';
        
        if (improvementsSplit.length > 1) {
            const remainingText = improvementsSplit[1];
            const revisedSplit = remainingText.split('REVISED TEXT:');
            suggestionsText = revisedSplit[0].trim();
            revisedText = revisedSplit.length > 1 ? revisedSplit[1].trim() : '';
        }

        // Process the fallacy markup
        processFallacyMarkup(fallacyText, container);

        // Add suggestions section if present
        if (suggestionsText) {
            const suggestionsDiv = document.createElement('div');
            suggestionsDiv.style.cssText = `
                margin-top: 24px;
                padding: 20px;
                background: var(--bg-secondary);
                border-radius: 12px;
                border: 2px solid var(--border-color);
            `;
            suggestionsDiv.innerHTML = `
                <h3 style="color: var(--text-primary); margin-bottom: 16px; font-size: 1.2rem;">💡 Suggested Improvements</h3>
                <div style="color: var(--text-primary); line-height: 1.7;">${suggestionsText.replace(/\n/g, '<br>')}</div>
            `;
            container.appendChild(suggestionsDiv);
        }

        // Add revised text section if present
        if (revisedText) {
            const revisedDiv = document.createElement('div');
            revisedDiv.style.cssText = `
                margin-top: 24px;
                padding: 20px;
                background: var(--bg-secondary);
                border-radius: 12px;
                border: 2px solid var(--border-color);
            `;
            
            const applyButton = document.createElement('button');
            applyButton.textContent = '✅ Apply Changes to My Argument';
            applyButton.style.cssText = `
                margin-top: 16px;
                background: linear-gradient(135deg, #48bb78, #38a169);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            `;
            
            applyButton.addEventListener('click', () => {
                const appliedText = applyDiffChanges(revisedText);
                if (appliedText) {
                    debateTextInput.value = appliedText;
                    debateTextInput.focus();
                    
                    // Show success message
                    const successMsg = document.createElement('div');
                    successMsg.style.cssText = `
                        margin-top: 12px;
                        padding: 12px;
                        background: var(--success-bg);
                        color: var(--success-text);
                        border: 1px solid var(--success-border);
                        border-radius: 8px;
                        font-weight: 500;
                    `;
                    successMsg.textContent = '✅ Changes applied to your argument! You can now edit further or analyze again.';
                    applyButton.parentNode.appendChild(successMsg);
                    
                    // Remove success message after 3 seconds
                    setTimeout(() => {
                        if (successMsg.parentNode) {
                            successMsg.remove();
                        }
                    }, 3000);
                }
            });
            
            revisedDiv.innerHTML = `
                <h3 style="color: var(--text-primary); margin-bottom: 16px; font-size: 1.2rem;">✏️ Revised Text</h3>
                <div style="color: var(--text-primary); line-height: 1.7; background: var(--bg-primary); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">${processDiffMarkup(revisedText)}</div>
            `;
            revisedDiv.appendChild(applyButton);
            container.appendChild(revisedDiv);
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
        const shouldSuggestImprovements = suggestImprovements.checked;

        analysisResultsDiv.innerHTML = '<p>Results will appear here.</p>'; // Reset results
        errorMessageP.textContent = '';
        errorMessageP.style.display = 'none';

        if (!settings.apiKey) {
            errorMessageP.textContent = 'API Key is not set. Please configure it in the Settings page.';
            errorMessageP.style.display = 'block';
            return;
        }

        // Get selected analysis type and validate input
        const analysisType = document.querySelector('input[name="analysis-type"]:checked').value;
        let hasTextInput = false;
        let hasImageInput = false;
        let textImageBase64 = '';

        switch (analysisType) {
            case 'text':
                hasTextInput = textToAnalyze.length > 0;
                if (!hasTextInput) {
                    errorMessageP.textContent = 'Please enter some text to analyze.';
                    errorMessageP.style.display = 'block';
                    return;
                }
                break;
            case 'image':
                hasImageInput = textImageUpload.files[0];
                if (!hasImageInput) {
                    errorMessageP.textContent = 'Please select an image to analyze.';
                    errorMessageP.style.display = 'block';
                    return;
                }
                try {
                    textImageBase64 = await readImageAsBase64(textImageUpload.files[0]);
                } catch (error) {
                    errorMessageP.textContent = 'Error reading text image. Please try again.';
                    errorMessageP.style.display = 'block';
                    return;
                }
                break;
            case 'file':
                if (!textFileUpload.files[0]) {
                    errorMessageP.textContent = 'Please select a text file to analyze.';
                    errorMessageP.style.display = 'block';
                    return;
                }
                try {
                    const fileContent = await readFileAsText(textFileUpload.files[0]);
                    debateTextInput.value = fileContent; // Set the text for analysis
                    hasTextInput = true;
                } catch (error) {
                    errorMessageP.textContent = 'Error reading text file. Please try again.';
                    errorMessageP.style.display = 'block';
                    return;
                }
                break;
        }

        // Get selected context type and process context
        const contextType = document.querySelector('input[name="context-type"]:checked').value;
        let contextContent = '';
        let contextImageBase64 = '';

        switch (contextType) {
            case 'text':
                contextContent = contextText.value.trim();
                break;
            case 'image':
                if (contextImageUpload.files[0]) {
                    try {
                        contextImageBase64 = await readImageAsBase64(contextImageUpload.files[0]);
                    } catch (error) {
                        errorMessageP.textContent = 'Error reading context image. Please try again.';
                        errorMessageP.style.display = 'block';
                        return;
                    }
                }
                break;
            case 'file':
                if (contextUpload.files[0]) {
                    try {
                        contextContent = await readFileAsText(contextUpload.files[0]);
                    } catch (error) {
                        errorMessageP.textContent = 'Error reading context file. Please try again.';
                        errorMessageP.style.display = 'block';
                        return;
                    }
                }
                break;
            case 'none':
            default:
                // No context
                break;
        }

        loadingIndicator.style.display = 'block';
        analyzeButton.disabled = true;

        let systemPrompt = `You are an expert in logical fallacies, critical thinking, and debate analysis.
Analyze the provided text for any logical fallacies, factual inaccuracies, or areas of weak reasoning.

${textImageBase64 ? 'The user has provided an image containing text. First, extract and transcribe ALL text from the image accurately, then analyze it.' : ''}

IMPORTANT GUIDELINES:
1. Consider established, verifiable facts from your knowledge base. Do NOT flag well-established facts as fallacies like "begging the question" or "circular reasoning" when they are used as premises.
2. Examples of established facts that should NOT be flagged: "Biden won the 2020 election", "Climate change is real", "The Earth is round", "COVID-19 is caused by a virus", etc.
3. Only flag logical fallacies in the REASONING and ARGUMENTATION, not in the statement of widely accepted facts.
4. Focus on actual logical errors, invalid inferences, and problematic reasoning patterns.

You must return the COMPLETE, ENTIRE original text with fallacies marked up in XML tags. Do not summarize, paraphrase, or shorten any part of the text.

For each identified issue, wrap ONLY the problematic portion in XML tags with this format:
<fallacy type="[fallacy_name]" explanation="[brief explanation of why this is problematic]">[the exact problematic text]</fallacy>

Examples:
- Original: "You're clearly an idiot, so your argument is wrong."
- Marked up: "<fallacy type="Ad Hominem" explanation="Attacking the person rather than addressing their argument">You're clearly an idiot</fallacy>, so your argument is wrong."

- Original: "So you think we should just let criminals run free?"
- Marked up: "<fallacy type="Straw Man" explanation="Misrepresenting the opponent's position to make it easier to attack">So you think we should just let criminals run free?</fallacy>"

- DO NOT FLAG: "Since Biden won the 2020 election, he is the legitimate president." (This is a valid premise based on established fact)
- DO FLAG: "Since I'm obviously right about everything, my argument must be correct." (This is circular reasoning)

Return the complete original text with fallacies wrapped in XML tags. Preserve all formatting, punctuation, and structure. If there are no fallacies, return the original text exactly as provided.`;

        if (shouldSuggestImprovements) {
            systemPrompt += `

ADDITIONAL TASK: After the marked-up text, add TWO sections:

1. "SUGGESTED IMPROVEMENTS:" with specific suggestions for how to improve the argument. Focus on:
   - Replacing fallacious reasoning with stronger logical arguments
   - Adding evidence or examples where claims are unsupported
   - Improving clarity and structure
   - Addressing potential counterarguments
   Format improvements as a numbered list with clear, actionable suggestions.

2. "REVISED TEXT:" with a complete rewrite of the original text that addresses the identified issues. Use diff-style formatting:
   - Wrap removed text in <removed>text to be removed</removed> tags
   - Wrap added text in <added>new text to be added</added> tags
   - Keep unchanged text as-is
   
   Example format:
   Original: "You're clearly wrong because everyone knows that."
   Revised: "<removed>You're clearly wrong because everyone knows that.</removed><added>I respectfully disagree with your position. According to recent studies by [specific source], the evidence suggests that [specific evidence].</added>"`;
        }

        if (contextContent || contextImageBase64) {
            systemPrompt += `

CONTEXT: The following context from previous messages has been provided to help inform your analysis:`;
            
            if (contextContent) {
                systemPrompt += `
${contextContent}`;
            }
            
            if (contextImageBase64) {
                systemPrompt += `
[Context image provided - extract any relevant text or information from this image]`;
            }
            
            systemPrompt += `

Use this context to better understand the ongoing discussion and provide more relevant suggestions.`;
        }

        try {
            // Build the user message with text and images
            let messages = [
                { role: "system", content: systemPrompt }
            ];

            // Create user message content array
            let userContent = [];

            // Add context if available
            if (contextContent) {
                userContent.push({
                    type: "text",
                    text: `Context:\n${contextContent}`
                });
            }

            if (contextImageBase64) {
                userContent.push({
                    type: "image_url",
                    image_url: {
                        url: `data:image/jpeg;base64,${contextImageBase64}`
                    }
                });
            }

            // Add main text or image to analyze
            if (hasTextInput) {
                userContent.push({
                    type: "text",
                    text: `${contextContent || contextImageBase64 ? '\n\nText to analyze:\n' : ''}${textToAnalyze}`
                });
            }

            if (textImageBase64) {
                userContent.push({
                    type: "image_url",
                    image_url: {
                        url: `data:image/jpeg;base64,${textImageBase64}`
                    }
                });
                
                if (!hasTextInput) {
                    userContent.push({
                        type: "text",
                        text: "Please analyze the text content in this image for logical fallacies."
                    });
                }
            }

            // If only text (no images), use simple string format for compatibility
            if (userContent.length === 1 && userContent[0].type === "text") {
                messages.push({
                    role: "user",
                    content: userContent[0].text
                });
            } else {
                messages.push({
                    role: "user",
                    content: userContent
                });
            }

            const response = await fetch(`${settings.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                    model: settings.defaultModel,
                    messages: messages,
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
                    processAnalysisResponse(fullResponse, analysisResultsDiv);
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
