import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

const isNative = Capacitor.isNativePlatform();

export class VoiceService {
    recognition: any;
    isListening: boolean = false;
    private onResult: (text: string, isFinal: boolean) => void;
    private onEnd: () => void;
    private onError: (error: any) => void;

    // Auto-stop timer - triggers final result after speech pause
    private autoStopTimer: any = null;
    private lastTranscript: string = '';

    constructor(
        onResult: (text: string, isFinal: boolean) => void,
        onEnd: () => void,
        onError: (error: any) => void
    ) {
        this.onResult = onResult;
        this.onEnd = onEnd;
        this.onError = onError;

        if (!isNative) {
            this.initWeb();
        }
    }

    private initWeb() {
        // @ts-ignore - Vendor prefixes
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
            // We don't error immediately, only when they try to start
            return;
        }

        this.recognition = new SpeechRecognitionAPI();
        this.recognition.continuous = false;
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                this.onResult(finalTranscript, true);
            } else if (interimTranscript) {
                this.onResult(interimTranscript, false);
            }
        };

        this.recognition.onspeechend = () => {
            // Do not stop immediately, let the final result come in
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.onEnd();
        };

        this.recognition.onerror = (event: any) => {
            this.isListening = false;
            // Map common web errors to standardized strings
            if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                this.onError('not-allowed');
            } else if (event.error === 'no-speech') {
                this.onError('no-speech');
            } else {
                this.onError(event.error);
            }
        };
    }

    async start() {
        if (this.isListening) return;

        if (isNative) {
            try {
                // 1. Check current status first
                const check = await SpeechRecognition.checkPermissions();

                // 2. Request if not granted
                // The plugin returns { speechRecognition: 'granted' | 'denied' ... }
                // We check multiple properties to be safe
                const status = (check as any).speechRecognition || (check as any).speech || (check as any).permission;

                if (status !== 'granted') {
                    const request = await SpeechRecognition.requestPermissions();

                    const newStatus = (request as any).speechRecognition || (request as any).speech || (request as any).permission;

                    if (newStatus !== 'granted') {
                        throw new Error('not-allowed');
                    }
                }

                // 3. Double Check Availability (Android specifically needs this)
                const available = await SpeechRecognition.available();

                if (!available.available) {
                    throw new Error('not-supported');
                }

                this.isListening = true;

                // 4. Start Listening
                // partialResults: true is crucial for real-time feedback
                await SpeechRecognition.start({
                    language: 'en-US',
                    partialResults: true,
                    popup: false,
                });

                // Add listener dynamically for native
                SpeechRecognition.removeAllListeners();
                SpeechRecognition.addListener('partialResults', (data: any) => {
                    if (data.matches && data.matches.length > 0) {
                        const transcript = data.matches[0];
                        this.onResult(transcript, false);

                        // Auto-stop logic: If transcript is stable for 1.5s, treat as final
                        clearTimeout(this.autoStopTimer);
                        this.lastTranscript = transcript;

                        this.autoStopTimer = setTimeout(async () => {
                            if (this.isListening && this.lastTranscript) {
                                // Stop and send final result
                                try {
                                    await SpeechRecognition.stop();
                                } catch (e) {
                                    // Ignore stop errors
                                }
                                this.isListening = false;
                                this.onResult(this.lastTranscript, true);
                                this.onEnd();
                            }
                        }, 1000); // 1 second of silence = done speaking (faster!)
                    }
                });

            } catch (error) {
                console.error("Native Voice Error:", error);
                this.isListening = false;

                // EXTRACT ERROR MESSAGE SAFELY
                let errorMessage = 'Unknown Error';
                if (error instanceof Error) {
                    errorMessage = error.message;
                } else if (typeof error === 'object' && error !== null) {
                    try {
                        errorMessage = JSON.stringify(error);
                        if (errorMessage === '{}') {
                            errorMessage = (error as any).message || (error as any).code || String(error);
                        }
                    } catch (e) {
                        errorMessage = String(error);
                    }
                } else {
                    errorMessage = String(error);
                }

                // Normalize error
                if (errorMessage.toLowerCase().includes('permission') || errorMessage.includes('not-allowed')) {
                    this.onError('not-allowed');
                } else {
                    this.onError(errorMessage);
                }
            }
        } else {
            // Web Logic
            if (!this.recognition) {
                this.onError('not-supported');
                return;
            }

            try {
                // iOS Safari Requirement: Request mic access explicitly via getUserMedia first
                // This "warms up" the permission if it hasn't been granted yet
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        stream.getTracks().forEach(track => track.stop());
                    } catch (permErr) {
                        this.onError('not-allowed');
                        return;
                    }
                }

                this.recognition.start();
                this.isListening = true;
            } catch (e) {
                console.error("Web Voice Start Error", e);
                // Often 'not-allowed' or 'service-not-allowed'
                this.onError(e);
            }
        }
    }

    async stop() {
        if (!this.isListening) return;

        // Clear auto-stop timer
        clearTimeout(this.autoStopTimer);

        if (isNative) {
            try {
                await SpeechRecognition.stop();
            } catch (e) {
                console.error("Stop error", e);
            }
        } else if (this.recognition) {
            this.recognition.stop();
        }
        this.isListening = false;
    }
}
