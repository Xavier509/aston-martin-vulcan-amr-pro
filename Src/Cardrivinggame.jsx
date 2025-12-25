import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const CarDrivingGame = () => {
  const containerRef = useRef(null);
  const [speed, setSpeed] = useState(0);
  const [gear, setGear] = useState(1);
  const [rpm, setRpm] = useState(800);
  const [cameraMode, setCameraMode] = useState('chase');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  
  useEffect(() => {
    if (!containerRef.current) return;

    let animationId;
    let car, scene, camera, renderer;

    const init = async () => {
      // Scene setup
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87ceeb);
      scene.fog = new THREE.Fog(0x87ceeb, 100, 600);

      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      containerRef.current.appendChild(renderer.domElement);

      // Lighting setup
      const sun = new THREE.DirectionalLight(0xffffff, 2);
      sun.position.set(100, 150, 50);
      sun.castShadow = true;
      sun.shadow.camera.left = -150;
      sun.shadow.camera.right = 150;
      sun.shadow.camera.top = 150;
      sun.shadow.camera.bottom = -150;
      sun.shadow.camera.far = 400;
      sun.shadow.mapSize.width = 4096;
      sun.shadow.mapSize.height = 4096;
      sun.shadow.bias = -0.0001;
      scene.add(sun);

      const ambient = new THREE.AmbientLight(0x404040, 1.2);
      scene.add(ambient);

      const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x6b8e6b, 0.8);
      scene.add(hemiLight);

      // Ground with texture
      const groundGeo = new THREE.PlaneGeometry(2000, 2000, 100, 100);
      const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x4a7c4a,
        roughness: 0.9,
        metalness: 0.1
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      
      // Terrain variation
      const vertices = groundGeo.attributes.position.array;
      for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        vertices[i + 2] = Math.sin(x * 0.02) * Math.cos(y * 0.02) * 3 + 
                          Math.sin(x * 0.05) * Math.cos(y * 0.08) * 1.5;
      }
      groundGeo.computeVertexNormals();
      scene.add(ground);

      // Main road
      const roadGeo = new THREE.PlaneGeometry(16, 2000);
      const roadMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a2a2a,
        roughness: 0.95,
        metalness: 0.05
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.y = 0.15;
      road.receiveShadow = true;
      scene.add(road);

      // Road markings - center line
      const centerLineGeo = new THREE.PlaneGeometry(0.4, 10);
      const centerLineMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      for (let i = -1000; i < 1000; i += 25) {
        const line = new THREE.Mesh(centerLineGeo, centerLineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.2, i);
        scene.add(line);
      }

      // Road edges
      const edgeLineGeo = new THREE.PlaneGeometry(0.3, 2000);
      const edgeLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      
      const leftEdge = new THREE.Mesh(edgeLineGeo, edgeLineMat);
      leftEdge.rotation.x = -Math.PI / 2;
      leftEdge.position.set(-7.85, 0.2, 0);
      scene.add(leftEdge);
      
      const rightEdge = new THREE.Mesh(edgeLineGeo, edgeLineMat);
      rightEdge.rotation.x = -Math.PI / 2;
      rightEdge.position.set(7.85, 0.2, 0);
      scene.add(rightEdge);

      // Enhanced tree creation
      const createTree = (x, z) => {
        const tree = new THREE.Group();
        
        const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 6, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ 
          color: 0x4a3020,
          roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 3;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);
        
        // Multiple foliage spheres for fuller look
        const foliageMat = new THREE.MeshStandardMaterial({ 
          color: 0x2d5016,
          roughness: 0.8
        });
        
        for (let i = 0; i < 3; i++) {
          const size = 3 - i * 0.5;
          const foliageGeo = new THREE.SphereGeometry(size, 8, 8);
          const foliage = new THREE.Mesh(foliageGeo, foliageMat);
          foliage.position.y = 5.5 + i * 1.5;
          foliage.castShadow = true;
          tree.add(foliage);
        }
        
        tree.position.set(x, 0, z);
        return tree;
      };

      // Place trees along road
      for (let i = 0; i < 200; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * (12 + Math.random() * 40);
        const z = (Math.random() - 0.5) * 1800;
        scene.add(createTree(x, z));
      }

      // Buildings for city environment
      const createBuilding = (x, z, w, h, d) => {
        const building = new THREE.Group();
        
        const mainGeo = new THREE.BoxGeometry(w, h, d);
        const mainMat = new THREE.MeshStandardMaterial({ 
          color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.2, 0.5),
          roughness: 0.7,
          metalness: 0.3
        });
        const main = new THREE.Mesh(mainGeo, mainMat);
        main.position.y = h / 2;
        main.castShadow = true;
        main.receiveShadow = true;
        building.add(main);
        
        // Windows
        const windowSize = 1.5;
        const windowMat = new THREE.MeshBasicMaterial({ color: 0xffff99 });
        const windowGeo = new THREE.PlaneGeometry(windowSize * 0.8, windowSize * 0.8);
        
        for (let y = 3; y < h - 2; y += 3) {
          for (let wx = -w/2 + 2; wx < w/2 - 1; wx += 2.5) {
            if (Math.random() > 0.3) {
              const window1 = new THREE.Mesh(windowGeo, windowMat);
              window1.position.set(wx, y, d/2 + 0.01);
              building.add(window1);
              
              const window2 = new THREE.Mesh(windowGeo, windowMat);
              window2.position.set(wx, y, -d/2 - 0.01);
              window2.rotation.y = Math.PI;
              building.add(window2);
            }
          }
        }
        
        building.position.set(x, 0, z);
        return building;
      };

      for (let i = 0; i < 50; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * (60 + Math.random() * 100);
        const z = (Math.random() - 0.5) * 1600;
        const w = 15 + Math.random() * 20;
        const h = 20 + Math.random() * 60;
        const d = 15 + Math.random() * 20;
        scene.add(createBuilding(x, z, w, h, d));
      }

      // Street lights
      const createStreetLight = (x, z) => {
        const light = new THREE.Group();
        
        const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 8, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 4;
        pole.castShadow = true;
        light.add(pole);
        
        const lampGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.y = 8;
        light.add(lamp);
        
        const pointLight = new THREE.PointLight(0xffffcc, 1, 30);
        pointLight.position.y = 8;
        pointLight.castShadow = true;
        light.add(pointLight);
        
        light.position.set(x, 0, z);
        return light;
      };

      for (let i = -900; i < 900; i += 60) {
        scene.add(createStreetLight(-10, i));
        scene.add(createStreetLight(10, i));
      }

      // Load car model or create fallback
      try {
        // Attempt to load GLB/GLTF model
        // Uncomment and modify this section when you add your model:
        /*
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();
        
        const gltf = await new Promise((resolve, reject) => {
          loader.load(
            '/models/car.glb', // Put your model path here
            resolve,
            (progress) => {
              console.log('Loading:', (progress.loaded / progress.total * 100) + '%');
            },
            reject
          );
        });
        
        car = gltf.scene;
        car.scale.set(1, 1, 1); // Adjust scale as needed
        
        // Enable shadows
        car.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        */
        
        // For now, create detailed fallback car
        car = createDetailedCar();
        
      } catch (error) {
        console.warn('Could not load model, using fallback:', error);
        car = createDetailedCar();
      }

      // Add wheels reference if not already present
      if (!car.wheels) {
        car.wheels = [];
        car.traverse((child) => {
          if (child.name && child.name.toLowerCase().includes('wheel')) {
            car.wheels.push(child);
          }
        });
      }

      car.position.set(0, 0, 0);
      scene.add(car);

      // Car physics state
      const carState = {
        velocity: new THREE.Vector3(0, 0, 0),
        angularVelocity: 0,
        acceleration: 0,
        steering: 0,
        speed: 0,
        rpm: 800,
        gear: 1,
        maxSpeed: 250,
        enginePower: 0.2,
        brakePower: 0.4,
        friction: 0.96,
        airResistance: 0.998,
        steeringSpeed: 0.04,
        maxSteering: 0.6,
        wheelRotation: 0,
        drifting: false
      };

      // Input handling
      const keys = {};
      const handleKeyDown = (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === 'c' || e.key === 'C') {
          const modes = ['chase', 'hood', 'cockpit', 'side', 'top'];
          const currentIndex = modes.indexOf(cameraMode);
          setCameraMode(modes[(currentIndex + 1) % modes.length]);
        }
        if (e.key === ' ') {
          e.preventDefault();
          carState.drifting = true;
        }
      };
      
      const handleKeyUp = (e) => {
        keys[e.key.toLowerCase()] = false;
        if (e.key === ' ') {
          carState.drifting = false;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      // Camera control
      const updateCamera = (mode) => {
        const offset = new THREE.Vector3();
        const lookAt = new THREE.Vector3();
        
        switch(mode) {
          case 'chase':
            offset.set(0, 8, -20);
            lookAt.set(0, 2, 15);
            break;
          case 'hood':
            offset.set(0, 3, 5);
            lookAt.set(0, 3, 30);
            break;
          case 'cockpit':
            offset.set(0, 3.5, 1);
            lookAt.set(0, 3.5, 20);
            break;
          case 'side':
            offset.set(15, 5, 0);
            lookAt.set(0, 2, 5);
            break;
          case 'top':
            offset.set(0, 30, -5);
            lookAt.set(0, 0, 10);
            break;
        }
        
        offset.applyQuaternion(car.quaternion);
        const targetPos = car.position.clone().add(offset);
        camera.position.lerp(targetPos, 0.1);
        
        lookAt.applyQuaternion(car.quaternion);
        const targetLookAt = car.position.clone().add(lookAt);
        const currentLookAt = new THREE.Vector3();
        camera.getWorldDirection(currentLookAt);
        currentLookAt.multiplyScalar(10).add(camera.position);
        currentLookAt.lerp(targetLookAt, 0.1);
        camera.lookAt(currentLookAt);
      };

      setLoading(false);

      // Animation loop
      const animate = () => {
        animationId = requestAnimationFrame(animate);

        // Input processing
        const accelerating = keys['w'] || keys['arrowup'];
        const braking = keys['s'] || keys['arrowdown'];
        const turningLeft = keys['a'] || keys['arrowleft'];
        const turningRight = keys['d'] || keys['arrowright'];

        // Acceleration
        if (accelerating) {
          carState.acceleration = carState.enginePower * (1 + carState.gear * 0.1);
          carState.rpm = Math.min(7500, 1500 + Math.abs(carState.speed) * 40 + Math.random() * 100);
        } else if (braking) {
          carState.acceleration = -carState.brakePower;
          carState.rpm = Math.max(800, carState.rpm - 80);
        } else {
          carState.acceleration = -0.02;
          carState.rpm = Math.max(800, carState.rpm - 30);
        }

        // Steering
        const steerFactor = carState.drifting ? 1.5 : 1;
        if (turningLeft) {
          carState.steering = Math.min(carState.steering + carState.steeringSpeed * steerFactor, carState.maxSteering);
        } else if (turningRight) {
          carState.steering = Math.max(carState.steering - carState.steeringSpeed * steerFactor, -carState.maxSteering);
        } else {
          carState.steering *= 0.85;
        }

        // Physics update
        carState.velocity.z += carState.acceleration;
        carState.velocity.z *= carState.friction * carState.airResistance;
        
        // Speed calculation (km/h)
        carState.speed = Math.abs(carState.velocity.z * 12);
        
        // Automatic transmission
        const gearRatios = [0, 30, 65, 110, 160, 220];
        for (let i = 1; i < gearRatios.length; i++) {
          if (carState.speed > gearRatios[i] && carState.gear === i) {
            carState.gear = Math.min(5, i + 1);
          } else if (carState.speed < gearRatios[i] - 10 && carState.gear === i + 1) {
            carState.gear = i;
          }
        }

        // Movement
        const moveVector = new THREE.Vector3(0, 0, carState.velocity.z);
        moveVector.applyQuaternion(car.quaternion);
        car.position.add(moveVector);

        // Rotation with speed-dependent steering
        if (Math.abs(carState.velocity.z) > 0.02) {
          const steerAmount = carState.steering * Math.abs(carState.velocity.z) * 0.4;
          const driftFactor = carState.drifting ? 1.3 : 1;
          car.rotateY(steerAmount * driftFactor);
          
          // Body lean in turns
          car.rotation.z = -carState.steering * 0.05 * Math.min(carState.speed / 100, 1);
        }

        // Wheel animation
        if (car.wheels && car.wheels.length > 0) {
          carState.wheelRotation += carState.velocity.z * 2;
          car.wheels.forEach((wheel, i) => {
            // Rotate wheels
            if (wheel.name && wheel.name.toLowerCase().includes('front')) {
              wheel.rotation.y = -carState.steering * 0.6;
            }
            // Spin wheels
            const rotAxis = wheel.name && wheel.name.toLowerCase().includes('left') ? 'x' : 'x';
            wheel.rotation[rotAxis] = carState.wheelRotation;
          });
        }

        // Keep car on road boundaries
        if (Math.abs(car.position.x) > 7) {
          car.position.x = Math.sign(car.position.x) * 7;
          carState.velocity.multiplyScalar(0.7);
        }

        // Update camera
        updateCamera(cameraMode);

        // Update UI
        setSpeed(Math.round(carState.speed));
        setGear(carState.gear);
        setRpm(Math.round(carState.rpm));

        renderer.render(scene, camera);
      };

      animate();

      // Handle resize
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        if (containerRef.current && renderer.domElement) {
          containerRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    };

    // Detailed fallback car
    const createDetailedCar = () => {
      const car = new THREE.Group();
      
      // Main body
      const bodyGeo = new THREE.BoxGeometry(4.5, 1.4, 9);
      const bodyMat = new THREE.MeshStandardMaterial({ 
        color: 0xdc143c,
        metalness: 0.9,
        roughness: 0.1
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 1.7;
      body.castShadow = true;
      car.add(body);

      // Hood
      const hoodGeo = new THREE.BoxGeometry(4.2, 0.8, 3);
      const hood = new THREE.Mesh(hoodGeo, bodyMat);
      hood.position.set(0, 2.5, 3);
      hood.castShadow = true;
      car.add(hood);

      // Cabin/Roof
      const cabinGeo = new THREE.BoxGeometry(4, 1.3, 4.5);
      const cabin = new THREE.Mesh(cabinGeo, bodyMat);
      cabin.position.set(0, 2.8, -0.5);
      cabin.castShadow = true;
      car.add(cabin);

      // Rear
      const rearGeo = new THREE.BoxGeometry(4.3, 1, 2);
      const rear = new THREE.Mesh(rearGeo, bodyMat);
      rear.position.set(0, 2.2, -4);
      rear.castShadow = true;
      car.add(rear);

      // Windows
      const windowMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111,
        metalness: 0.95,
        roughness: 0.05,
        transparent: true,
        opacity: 0.7
      });
      
      const windshieldGeo = new THREE.BoxGeometry(3.8, 1.1, 0.1);
      const windshield = new THREE.Mesh(windshieldGeo, windowMat);
      windshield.position.set(0, 2.9, 1.2);
      windshield.rotation.x = -0.2;
      car.add(windshield);

      const rearWindowGeo = new THREE.BoxGeometry(3.8, 1, 0.1);
      const rearWindow = new THREE.Mesh(rearWindowGeo, windowMat);
      rearWindow.position.set(0, 2.8, -2.7);
      rearWindow.rotation.x = 0.15;
      car.add(rearWindow);

      const sideWindowGeo = new THREE.BoxGeometry(0.1, 1, 4);
      const leftWindow = new THREE.Mesh(sideWindowGeo, windowMat);
      leftWindow.position.set(-2, 2.8, -0.5);
      car.add(leftWindow);

      const rightWindow = new THREE.Mesh(sideWindowGeo, windowMat);
      rightWindow.position.set(2, 2.8, -0.5);
      car.add(rightWindow);

      // Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.6, 32);
      const tireMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        metalness: 0.3,
        roughness: 0.9
      });

      const rimGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.65, 6);
      const rimMat = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        metalness: 0.9,
        roughness: 0.1
      });

      const wheelPositions = [
        { x: -1.9, z: 3, name: 'wheel_front_left' },
        { x: 1.9, z: 3, name: 'wheel_front_right' },
        { x: -1.9, z: -3, name: 'wheel_rear_left' },
        { x: 1.9, z: -3, name: 'wheel_rear_right' }
      ];

      car.wheels = [];
      wheelPositions.forEach(({x, z, name}) => {
        const wheelGroup = new THREE.Group();
        wheelGroup.name = name;
        
        const tire = new THREE.Mesh(wheelGeo, tireMat);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        wheelGroup.add(tire);
        
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.z = Math.PI / 2;
        wheelGroup.add(rim);
        
        wheelGroup.position.set(x, 0.7, z);
        car.add(wheelGroup);
        car.wheels.push(wheelGroup);
      });

      // Headlights
      const headlightGeo = new THREE.CircleGeometry(0.35, 16);
      const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
      
      [-1.4, 1.4].forEach(x => {
        const headlight = new THREE.Mesh(headlightGeo, headlightMat);
        headlight.position.set(x, 1.8, 4.51);
        car.add(headlight);
        
        const light = new THREE.SpotLight(0xffffee, 2, 50, Math.PI / 6, 0.5);
        light.position.set(x, 1.8, 4.6);
        light.target.position.set(x, 1, 20);
        car.add(light);
        car.add(light.target);
      });

      // Taillights
      const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      [-1.4, 1.4].forEach(x => {
        const taillight = new THREE.Mesh(headlightGeo, taillightMat);
        taillight.position.set(x, 1.8, -4.51);
        taillight.rotation.y = Math.PI;
        car.add(taillight);
      });

      // Side mirrors
      const mirrorGeo = new THREE.BoxGeometry(0.3, 0.2, 0.4);
      const mirrorMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        metalness: 0.8,
        roughness: 0.2
      });
      
      [-2.2, 2.2].forEach(x => {
        const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
        mirror.position.set(x, 2.9, 1);
        car.add(mirror);
      });

      // Spoiler
      const spoilerGeo = new THREE.BoxGeometry(4, 0.1, 1.2);
      const spoiler = new THREE.Mesh(spoilerGeo, bodyMat);
      spoiler.position.set(0, 2.5, -4.8);
      spoiler.rotation.x = -0.3;
      car.add(spoiler);

      const spoilerSupportGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
      [-1.5, 1.5].forEach(x => {
        const support = new THREE.Mesh(spoilerSupportGeo, bodyMat);
        support.position.set(x, 2, -4.5);
        car.add(support);
      });

      car.position.y = 0.5;
      return car;
    };

    init().catch(err => {
      console.error('Initialization error:', err);
      setLoadError(err.message);
      setLoading(false);
    });

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [cameraMode]);

  if (loadError) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        color: 'white',
        fontFamily: 'monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Error Loading Game</h2>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        color: 'white',
        fontFamily: 'monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading Game...</h2>
          <div style={{ marginTop: '20px' }}>Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <div ref={containerRef} />
      
      {/* Dashboard HUD */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '30px',
        color: 'white',
        fontFamily: "'Orbitron', monospace",
        fontSize: '20px',
        textShadow: '0 0 10px rgba(220, 20, 60, 0.8)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '25px',
        borderRadius: '15px',
        border: '2px solid rgba(220, 20, 60, 0.5)',
        minWidth: '180px'
      }}>
        <div style={{ 
          marginBottom: '12px', 
          fontSize: '48px', 
          fontWeight: 'bold',
          color: '#dc143c'
        }}>
          {speed}
          <span style={{ fontSize: '20px', marginLeft: '8px' }}>km/h</span>
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Gear:</span>
          <span style={{ color: '#dc143c', fontWeight: 'bold', fontSize: '24px' }}>{gear}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>RPM:</span>
          <span style={{ 
            color: rpm > 6000 ? '#ff4444' : '#4caf50',
            fontWeight: 'bold'
          }}>{rpm}</span>
        </div>
        
        {/* RPM Bar */}
        <div style={{
          marginTop: '15px',
          height: '8px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${(rpm / 7500) * 100}%`,
            backgroundColor: rpm > 6500 ? '#ff4444' : rpm > 5000 ? '#ffaa00' : '#4caf50',
            transition: 'width 0.1s, background-color 0.3s'
          }} />
        </div>
      </div>

      {/* Controls Info */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '20px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.2)',
        textAlign: 'left'
      }}>
        <div style={{ 
          marginBottom: '12px', 
          fontWeight: 'bold',
          fontSize: '16px',
          borderBottom: '1px solid rgba(255,255,255,0.3)',
          paddingBottom: '8px'
        }}>
          CONTROLS
        </div>
        <div style={{ marginBottom: '6px' }}>
          <span style={{ color: '#dc143c' }}>W/↑</span> - Accelerate
        </div>
        <div style={{ marginBottom: '6px' }}>
          <span style={{ color: '#dc143c' }}>S/↓</span> - Brake/Reverse
        </div>
        <div style={{ marginBottom: '6px' }}>
          <span style={{ color: '#dc143c' }}>A/←</span> - Turn Left
        </div>
        <div style={{ marginBottom: '6px' }}>
          <span style={{ color: '#dc143c' }}>D/→</span> - Turn Right
        </div>
        <div style={{ marginBottom: '6px' }}>
          <span style={{ color: '#dc143c' }}>SPACE</span> - Drift Mode
        </div>
        <div>
          <span style={{ color: '#dc143c' }}>C</span> - Camera ({cameraMode})
        </div>
      </div>

      {/* Speedometer Gauge */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        right: '30px',
        width: '180px',
        height: '180px'
      }}>
        <svg width="180" height="180" style={{ position: 'absolute' }}>
          {/* Background circle */}
          <circle
            cx="90"
            cy="90"
            r="75"
            fill="rgba(0,0,0,0.7)"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
          />
          
          {/* Speed arc background */}
          <circle
            cx="90"
            cy="90"
            r="70"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="12"
            strokeDasharray="439.8"
            strokeDashoffset="110"
            transform="rotate(-90 90 90)"
          />
          
          {/* Speed arc */}
          <circle
            cx="90"
            cy="90"
            r="70"
            fill="none"
            stroke={speed > 200 ? '#ff4444' : speed > 150 ? '#ffaa00' : '#dc143c'}
            strokeWidth="12"
            strokeDasharray={`${(Math.min(speed, 250) / 250) * 329.85} 439.8`}
            strokeDashoffset="110"
            transform="rotate(-90 90 90)"
            style={{ transition: 'stroke 0.3s' }}
          />
          
          {/* Center decoration */}
          <circle
            cx="90"
            cy="90"
            r="15"
            fill="rgba(220, 20, 60, 0.3)"
            stroke="#dc143c"
            strokeWidth="2"
          />
        </svg>
        
        {/* Speed text */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'white',
          fontFamily: "'Orbitron', monospace"
        }}>
          <div style={{
            fontSize: '36px',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(220, 20, 60, 0.8)'
          }}>
            {speed}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>
            km/h
          </div>
        </div>
        
        {/* Speed markers */}
        {[0, 50, 100, 150, 200, 250].map((mark, i) => {
          const angle = -90 + (i * 270 / 5);
          const rad = (angle * Math.PI) / 180;
          const x = 90 + 65 * Math.cos(rad);
          const y = 90 + 65 * Math.sin(rad);
          return (
            <text
              key={mark}
              x={x}
              y={y}
              fill="rgba(255,255,255,0.5)"
              fontSize="10"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ pointerEvents: 'none' }}
            >
              {mark}
            </text>
          );
        })}
      </div>

      {/* Mini Map (Top-down view indicator) */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '150px',
        height: '150px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        border: '2px solid rgba(255,255,255,0.3)',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          color: 'white',
          fontSize: '12px',
          fontFamily: 'monospace',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '8px', opacity: 0.7 }}>POSITION</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            X: {Math.round(speed * Math.sin(Date.now() / 1000) / 10)}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            Z: {Math.round(Date.now() / 100) % 1000}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarDrivingGame;
