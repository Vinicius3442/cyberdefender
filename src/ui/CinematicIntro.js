
export class CinematicIntro {
    constructor(onComplete) {
        this.onComplete = onComplete;
        this.container = document.createElement('div');
        this.container.id = 'cinematic-intro';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = '#000';
        this.container.style.zIndex = '10000';
        this.container.style.overflow = 'hidden';
        
        document.body.appendChild(this.container);
        
        this.init();
    }
    
    init() {
        // Create Canvas for Space Station Animation
        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);
        
        this.startTime = performance.now();
        this.podLaunched = false;
        this.podY = 0;
        
        // Start Loop
        this.animate();
        
        // Launch Pod after 2s
        setTimeout(() => { this.podLaunched = true; }, 2000);
        
        // End after 5s
        setTimeout(() => { this.finish(); }, 5000);
        
        window.addEventListener('resize', () => {
             this.canvas.width = window.innerWidth;
             this.canvas.height = window.innerHeight;
        });
    }
    
    animate() {
        if (!this.container.parentElement) return; // Stopped
        
        requestAnimationFrame(() => this.animate());
        
        const time = (performance.now() - this.startTime) / 1000;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;
        
        // Clear Space
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        
        // Draw Planet (Bottom)
        const planetY = h + 200;
        const gradient = ctx.createRadialGradient(w/2, planetY, 200, w/2, planetY, 1500);
        gradient.addColorStop(0, '#0044ff');
        gradient.addColorStop(0.5, '#001133');
        gradient.addColorStop(1, '#000');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(w/2, planetY, 1200, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw Stars (Parallax)
        ctx.fillStyle = '#fff';
        for(let i=0; i<100; i++) {
            const x = (Math.sin(i * 132.1) * 10000 + time * 10) % w;
            const y = (Math.cos(i * 532.1) * 10000) % h;
            if (x > 0 && y > 0 && y < h - 200) ctx.fillRect(x, y, Math.random() < 0.5 ? 2 : 1, Math.random() < 0.5 ? 2 : 1);
        }
        
        // Draw Space Station (Top Center)
        const stationX = w/2;
        const stationY = 150;
        
        ctx.save();
        ctx.translate(stationX, stationY);
        // Rotate slowly
        ctx.rotate(time * 0.1);
        
        // Station Body
        ctx.fillStyle = '#444';
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 4;
        
        // Hub
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        
        // Rings
        ctx.beginPath();
        ctx.ellipse(0, 0, 140, 40, time, 0, Math.PI*2);
        ctx.stroke();
        
        ctx.restore();
        
        // Draw Drop Pod
        if (this.podLaunched) {
            this.podY += (this.podY + 5) * 0.05; // Accelerate
            
            ctx.save();
            ctx.translate(w/2, 150 + this.podY);
            
            // Pod
            ctx.fillStyle = '#fff';
            ctx.fillRect(-10, -10, 20, 30);
            
            // Thruster
            ctx.fillStyle = '#f00';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#f00';
            ctx.beginPath();
            ctx.moveTo(-5, -10);
            ctx.lineTo(5, -10);
            ctx.lineTo(0, -30 - Math.random()*10);
            ctx.fill();
            
            ctx.restore();
        }
        
        // Overlay Text & Letterbox Bars
        // Top Letterbox Bar
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, 60);
        // Bottom Letterbox Bar
        ctx.fillRect(0, h - 60, w, 60);

        ctx.fillStyle = '#00ffcc';
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 22px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`ORBITAL STATION ALPHA [SYSTEM ACTIVE]`, 50, 40);
        
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.fillText(`DEPLOYING UNIT: CYBER-DEFENDER CP-77`, 50, 95);

        if (this.podLaunched) {
             ctx.fillStyle = '#ff0055';
             ctx.shadowColor = '#ff0055';
             ctx.shadowBlur = 15;
             ctx.font = 'bold 26px "Courier New", monospace';
             ctx.fillText(`>>> ATMOSPHERIC ENTRY INITIATED <<<`, 50, 135);
        }
        ctx.shadowBlur = 0;
    }
    
    finish() {
        if (this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
        if (this.onComplete) this.onComplete();
    }
}
