// Wait until the DOM is fully loaded before running the WebGL code
window.addEventListener('DOMContentLoaded', () => {
    // WebGL setup
    const canvas = document.querySelector('#webglCanvas');
    if (!canvas) {
      console.error('Canvas element not found!');
      return;
    }

    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Scene and Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 1.5; // Adjust camera for a better view

    // Grid Geometry - Reduced segments
    const segments = 30;
    const geometry = new THREE.PlaneGeometry(3, 3, segments, segments);

    // Custom Shader Material (for gradient)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_color1: { value: new THREE.Color(0x1e46fa) },  // Blue
        u_color2: { value: new THREE.Color(0xfa1eef) }   // Purple
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 u_color1;
        uniform vec3 u_color2;

        void main() {
          vec3 color = mix(u_color1, u_color2, vUv.y);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      wireframe: true
    });

    // Create Grid Mesh
    const grid = new THREE.Mesh(geometry, material);
    grid.position.x = 1.5;  // Shift grid to the right
    scene.add(grid);

    // Mouse Movement for Distortion
    let mouse = new THREE.Vector2();
    window.addEventListener('mousemove', (event) => {
      // Calculate normalized mouse coordinates (-1 to 1)
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });
    
    // Animation and Bulge Effect
    function animate() {
      requestAnimationFrame(animate);
    
      const position = grid.geometry.attributes.position;
      const vertices = position.array;
      const strength = 0.7;

      // Get the grid position offset (1.5 units in this case)
      const gridOffsetX = grid.position.x;

      for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];

        // Adjust mouse x coordinate by subtracting the grid's position
        const dx = (mouse.x * 2 - x - gridOffsetX);
        const dy = mouse.y * 2 - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const bulge = Math.exp(-distance * 6) * strength;
        vertices[i + 2] = bulge;  // Alter Z position for bulge effect
      }

      position.needsUpdate = true;
      renderer.render(scene, camera);
    }

    animate();

    // Responsive Resize
    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    });
  });
