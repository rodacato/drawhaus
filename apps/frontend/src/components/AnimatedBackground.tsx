import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Subtle animated particle field background using three.js.
 * Renders floating dots that drift gently — alive but not distracting.
 */
export function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Particle system — soft floating dots
    const PARTICLE_COUNT = 120;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      velocities[i * 3] = (Math.random() - 0.5) * 0.008;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.008;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.004;

      sizes[i] = Math.random() * 2.5 + 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x0ea5e9) },
      },
      vertexShader: `
        attribute float size;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          pos.x += sin(uTime * 0.3 + position.y * 0.5) * 0.5;
          pos.y += cos(uTime * 0.2 + position.x * 0.3) * 0.4;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (20.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = 0.12 + 0.08 * sin(uTime * 0.5 + position.x);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Gentle connecting lines between nearby particles
    const lineGeometry = new THREE.BufferGeometry();
    const MAX_LINES = 200;
    const linePositions = new Float32Array(MAX_LINES * 6);
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.04,
    });

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Mouse interaction — subtle attraction
    const mouse = new THREE.Vector2(0, 0);
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    container.addEventListener("mousemove", onMouseMove);

    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      material.uniforms.uTime.value = elapsed;

      const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      // Drift particles
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        posArray[i * 3] += velocities[i * 3];
        posArray[i * 3 + 1] += velocities[i * 3 + 1];
        posArray[i * 3 + 2] += velocities[i * 3 + 2];

        // Wrap around
        if (posArray[i * 3] > 30) posArray[i * 3] = -30;
        if (posArray[i * 3] < -30) posArray[i * 3] = 30;
        if (posArray[i * 3 + 1] > 20) posArray[i * 3 + 1] = -20;
        if (posArray[i * 3 + 1] < -20) posArray[i * 3 + 1] = 20;
      }
      posAttr.needsUpdate = true;

      // Update connecting lines
      let lineIdx = 0;
      const lp = lines.geometry.getAttribute("position") as THREE.BufferAttribute;
      const lpArray = lp.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT && lineIdx < MAX_LINES; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT && lineIdx < MAX_LINES; j++) {
          const dx = posArray[i * 3] - posArray[j * 3];
          const dy = posArray[i * 3 + 1] - posArray[j * 3 + 1];
          const dz = posArray[i * 3 + 2] - posArray[j * 3 + 2];
          const dist = dx * dx + dy * dy + dz * dz;
          if (dist < 80) {
            lpArray[lineIdx * 6] = posArray[i * 3];
            lpArray[lineIdx * 6 + 1] = posArray[i * 3 + 1];
            lpArray[lineIdx * 6 + 2] = posArray[i * 3 + 2];
            lpArray[lineIdx * 6 + 3] = posArray[j * 3];
            lpArray[lineIdx * 6 + 4] = posArray[j * 3 + 1];
            lpArray[lineIdx * 6 + 5] = posArray[j * 3 + 2];
            lineIdx++;
          }
        }
      }
      // Zero out unused lines
      for (let i = lineIdx; i < MAX_LINES; i++) {
        lpArray[i * 6] = 0;
        lpArray[i * 6 + 1] = 0;
        lpArray[i * 6 + 2] = 0;
        lpArray[i * 6 + 3] = 0;
        lpArray[i * 6 + 4] = 0;
        lpArray[i * 6 + 5] = 0;
      }
      lp.needsUpdate = true;
      lines.geometry.setDrawRange(0, lineIdx * 2);

      // Subtle camera drift based on mouse
      camera.position.x += (mouse.x * 3 - camera.position.x) * 0.01;
      camera.position.y += (mouse.y * 2 - camera.position.y) * 0.01;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto absolute inset-0 -z-10 overflow-hidden"
      style={{ pointerEvents: "none" }}
    />
  );
}
