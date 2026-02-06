import * as THREE from 'three';
import { Utils } from '../core/Utils.js';

export class CitadelEye {
    constructor(scene, player, position) {
        this.scene = scene;
        this.player = player;
        this.position = position;
        
        this.lookThreshold = 0.95; // Dot product threshold (very direct look)
        this.damageRate = 10;
        this.glitchIntensity = 0;
        
        this._createMesh();
        this._createUI();
    }

    _createMesh() {
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);

        // Eye Ball (Emission)
        const geo = new THREE.SphereGeometry(4, 32, 32);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.eyeMesh = new THREE.Mesh(geo, mat);
        this.mesh.add(this.eyeMesh);

        // Flames/Aura (Particles would be better, but simple mesh for now)
        const auraGeo = new THREE.SphereGeometry(5, 16, 16);
        const auraMat = new THREE.MeshBasicMaterial({ 
            color: 0xff4400, 
            transparent: true, 
            opacity: 0.3,
            wireframe: true
        });
        this.aura = new THREE.Mesh(auraGeo, auraMat);
        this.mesh.add(this.aura);

        this.scene.add(this.mesh);
    }

    _createUI() {
        // Glitch Overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'eye-glitch';
        this.overlay.style.position = 'absolute';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.pointerEvents = 'none';
        this.overlay.style.display = 'none';
        this.overlay.style.zIndex = '1000';
        
        // CSS Glitch Effect
        // Stronger Red Vignette
        this.overlay.style.background = 'radial-gradient(circle, transparent 20%, rgba(255, 0, 0, 0.4) 80%, rgba(255, 0, 0, 0.8) 100%)';
        this.overlay.style.mixBlendMode = 'hard-light'; // More aggressive blend
        
        // Text Container
        this.textContainer = document.createElement('div');
        this.textContainer.style.position = 'absolute';
        this.textContainer.style.top = '50%';
        this.textContainer.style.width = '100%';
        this.textContainer.style.textAlign = 'center';
        this.textContainer.style.fontFamily = 'Courier New';
        this.textContainer.style.fontWeight = 'bold';
        this.textContainer.style.fontSize = '40px';
        this.textContainer.style.color = 'red';
        this.textContainer.style.textShadow = '2px 0 blue, -2px 0 green';
        this.textContainer.innerHTML = "J O I N &nbsp; U S";
        
        this.overlay.appendChild(this.textContainer);
        document.body.appendChild(this.overlay);
    }

    update(dt) {
        // 1. Look at player
        this.mesh.lookAt(this.player.position);
        
        // 2. Animate Aura
        this.aura.rotation.z += dt;
        this.aura.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.1);

        // 3. Check if Player is looking at Eye
        const toEye = new THREE.Vector3().subVectors(this.mesh.position, this.player.camera.position).normalize();
        const lookDir = this.player.camera.getWorldDirection(new THREE.Vector3());
        
        const dot = lookDir.dot(toEye);
        
        // Threshold 0.85 (approx 30 degrees)
        if (dot > 0.85) {
            // Player is looking at the eye
            this.glitchIntensity = Math.min(this.glitchIntensity + dt * 2, 1);
            
            // Effect
            this.overlay.style.display = 'block';
            this.overlay.style.opacity = this.glitchIntensity;
            
            // Random Text Position
            if (Math.random() < 0.1) {
                const x = (Math.random() - 0.5) * 20;
                const y = (Math.random() - 0.5) * 20;
                this.textContainer.style.transform = `translate(${x}px, ${y}px) skew(${Math.random()*20}deg)`;
                this.textContainer.innerHTML = Math.random() < 0.5 ? "J O I N &nbsp; U S" : "S U B M I T";
            }
            
            // DAMAGE PLAYER
            if (this.player && this.player.takeDamage) {
                // Apply damage over time
                this.player.takeDamage(this.damageRate * dt);
            }
            
        } else {
            // Decay
            this.glitchIntensity = Math.max(this.glitchIntensity - dt, 0);
            if (this.glitchIntensity <= 0) {
                this.overlay.style.display = 'none';
            } else {
                this.overlay.style.opacity = this.glitchIntensity;
            }
        }
        
        if (this.glitchIntensity > 0) {
             this.overlay.style.opacity = this.glitchIntensity;
             // Apply screen shake or color shift?
        }
    }
    
    dispose() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
    }
}
