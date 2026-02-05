
export class BootSequence {
    constructor(onComplete) {
        this.onComplete = onComplete;
        this.container = document.getElementById('boot-sequence');
        this.textElement = document.getElementById('boot-text');
        this.shutters = document.getElementById('shutters');
        this.skipped = false;

        // Logs to display
        this.logs = [
            "Initializing Kernel...",
            "Loading Modules: [CPU, MEM, GPU, NEURAL_NET]",
            "Mounting Visual Cortex...",
            "Checking Peripherals... OK",
            "Connecting to Skynet... ERROR: Connection Refused",
            "Fallback to Local Mode...",
            "Loading Weapon Systems...",
            "Calibrating Gyroscopes...",
            "Simulating Reality v41.2...",
            "Wake up, Soldier."
        ];
    }

    start() {
        this.container.style.display = 'block';
        this.textElement.innerHTML = '';
        
        // Ensure shutters are visible and closed (removing open class just in case)
        if (this.shutters) {
            this.shutters.style.display = 'block';
            this.shutters.classList.remove('open');
        }
        
        // Add skip listener
        this.clickHandler = () => this.skip();
        document.addEventListener('click', this.clickHandler);
        document.addEventListener('keydown', this.clickHandler);

        this.typeLogs(0);
    }

    typeLogs(index) {
        if (this.skipped) return;
        if (index >= this.logs.length) {
            this.finish();
            return;
        }

        const line = this.logs[index];
        const p = document.createElement('div');
        p.textContent = "> " + line;
        
        // Random colors for effect
        if (line.includes("ERROR")) p.style.color = "#f33";
        else if (line.includes("OK")) p.style.color = "#0f0";
        else p.style.color = "#0f0";

        this.textElement.appendChild(p);
        this.container.scrollTop = this.container.scrollHeight;

        // Random delay for typing effect feel
        const delay = Math.random() * 300 + 100;
        
        setTimeout(() => {
            this.typeLogs(index + 1);
        }, delay);
    }

    skip() {
        if (this.skipped) return;
        this.skipped = true;
        this.finish();
    }

    finish() {
        // Clean up listeners
        document.removeEventListener('click', this.clickHandler);
        document.removeEventListener('keydown', this.clickHandler);

        // Glitch effect on body/container
        document.body.classList.add('glitch-transition');

        // Open shutters
        if (this.shutters) {
            this.shutters.classList.add('open');
        }

        // Hide boot text after short delay
        setTimeout(() => {
            this.container.style.display = 'none';
            document.body.classList.remove('glitch-transition');
            
            // Hide shutters after they are fully open (transition is 0.5s)
            setTimeout(() => {
                if (this.shutters) this.shutters.style.display = 'none';
                if (this.onComplete) this.onComplete();
            }, 600);
            
        }, 500);
    }
}
