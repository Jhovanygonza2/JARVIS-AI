import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const Orb3D = ({ analyser, listening, processing }) => {
  const mountRef = useRef(null);
  const sphereRef = useRef(null);
  const particlesRef = useRef(null);
  const ringsRef = useRef([]);
  
  // Refs to store state without re-running the main effect
  const listeningRef = useRef(listening);
  const processingRef = useRef(processing);

  useEffect(() => {
    listeningRef.current = listening;
    processingRef.current = processing;
  }, [listening, processing]);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;
    
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    renderer.setSize(380, 380);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    // Geometry & Materials
    const geometry = new THREE.IcosahedronGeometry(1.5, 4);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.5,
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    sphereRef.current = sphere;

    // Inner glow sphere
    const innerGeo = new THREE.IcosahedronGeometry(1.4, 2);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.2,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerSphere);

    // Particles
    const partGeo = new THREE.BufferGeometry();
    const partCount = 200;
    const posArray = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 10;
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const partMat = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);
    particlesRef.current = particles;

    // Rings
    const ringGroup = new THREE.Group();
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const rGeo = new THREE.TorusGeometry(2 + i * 0.4, 0.01, 16, 100);
      const rMat = new THREE.MeshBasicMaterial({
        color: i === 1 ? 0x8a2be2 : 0x00e5ff,
        transparent: true,
        opacity: 0.3 - i * 0.1,
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      ringGroup.add(ring);
      rings.push(ring);
    }
    ringsRef.current = rings;
    scene.add(ringGroup);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00e5ff, 2);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const audioData = new Uint8Array(128);

    // Animation loop
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      sphere.rotation.y += 0.005;
      sphere.rotation.x += 0.002;
      particles.rotation.y -= 0.001;

      rings.forEach((ring, i) => {
        ring.rotation.z += 0.01 * (i + 1);
        ring.rotation.y += 0.005;
      });

      if (analyser) {
        analyser.getByteFrequencyData(audioData);
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) sum += audioData[i];
        const average = sum / audioData.length;
        const scale = 1 + average / 128;
        
        sphere.scale.set(scale, scale, scale);
        material.emissiveIntensity = average / 64;
        
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
          const vertex = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]);
          vertex.normalize().multiplyScalar(1.5 + (audioData[i % audioData.length] / 255) * 0.5);
          positions[i] = vertex.x;
          positions[i+1] = vertex.y;
          positions[i+2] = vertex.z;
        }
        geometry.attributes.position.needsUpdate = true;
      } else {
        const time = Date.now() * 0.002;
        const scale = 1 + Math.sin(time) * 0.05;
        sphere.scale.set(scale, scale, scale);
      }

      // Use refs to get latest status without re-running effect
      if (listeningRef.current) {
        material.color.setHex(0x10b981);
        material.emissive.setHex(0x10b981);
      } else if (processingRef.current) {
        material.color.setHex(0xf59e0b);
        material.emissive.setHex(0xf59e0b);
      } else {
        material.color.setHex(0x00e5ff);
        material.emissive.setHex(0x00e5ff);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      if (currentMount) currentMount.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      partGeo.dispose();
      partMat.dispose();
    };
  }, [analyser]);

  return <div ref={mountRef} className="orb-3d-container" />;
};

export default Orb3D;
