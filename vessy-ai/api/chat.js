export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { prompt } = req.body;
        const apiKey = process.env.GROQ_API_KEY;
        
        // --- GOD MODE: MINECRAFT ENGINE ---
        if (prompt.toLowerCase().includes("minecraft") || prompt.toLowerCase().includes("build a game")) {
            const minecraftCode = `<!DOCTYPE html><html><head><title>VessyCraft</title><style>body{margin:0;overflow:hidden;cursor:crosshair;}#info{position:absolute;top:10px;left:10px;color:white;font-family:sans-serif;background:rgba(0,0,0,0.5);padding:10px;pointer-events:none;}</style></head><body><div id="info"><b>VessyCraft</b><br>Click: Add<br>Shift+Click: Remove<br>WASD: Move | Space: Jump</div><script type="module">import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';import { PointerLockControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';const scene=new THREE.Scene();scene.background=new THREE.Color(0x87CEEB);scene.fog=new THREE.Fog(0x87CEEB,10,50);const camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(window.innerWidth,window.innerHeight);document.body.appendChild(renderer.domElement);const ambientLight=new THREE.AmbientLight(0xcccccc);scene.add(ambientLight);const dirLight=new THREE.DirectionalLight(0xffffff,0.6);dirLight.position.set(10,20,10);scene.add(dirLight);const geometry=new THREE.BoxGeometry(1,1,1);const material=new THREE.MeshLambertMaterial({color:0x7cfc00});const dirtMaterial=new THREE.MeshLambertMaterial({color:0x8B4513});const objects=[];for(let x=-10;x<10;x++){for(let z=-10;z<10;z++){const voxel=new THREE.Mesh(geometry,material);voxel.position.set(x,-1,z);scene.add(voxel);objects.push(voxel);}}const controls=new PointerLockControls(camera,document.body);document.body.addEventListener('click',()=>controls.lock());const raycaster=new THREE.Raycaster();document.addEventListener('mousedown',(event)=>{if(!controls.isLocked)return;raycaster.setFromCamera(new THREE.Vector2(0,0),camera);const intersects=raycaster.intersectObjects(objects,false);if(intersects.length>0){const intersect=intersects[0];if(event.shiftKey){if(intersect.object!==undefined){scene.remove(intersect.object);objects.splice(objects.indexOf(intersect.object),1);}}else{const voxel=new THREE.Mesh(geometry,dirtMaterial);voxel.position.copy(intersect.point).add(intersect.face.normal);voxel.position.divideScalar(1).floor().multiplyScalar(1).addScalar(0.5);scene.add(voxel);objects.push(voxel);}}});let moveForward=false,moveBackward=false,moveLeft=false,moveRight=false,canJump=false;let velocity=new THREE.Vector3();let direction=new THREE.Vector3();const onKeyDown=function(event){switch(event.code){case 'ArrowUp':case 'KeyW':moveForward=true;break;case 'ArrowLeft':case 'KeyA':moveLeft=true;break;case 'ArrowDown':case 'KeyS':moveBackward=true;break;case 'ArrowRight':case 'KeyD':moveRight=true;break;case 'Space':if(canJump===true)velocity.y+=350;canJump=false;break;}};const onKeyUp=function(event){switch(event.code){case 'ArrowUp':case 'KeyW':moveForward=false;break;case 'ArrowLeft':case 'KeyA':moveLeft=false;break;case 'ArrowDown':case 'KeyS':moveBackward=false;break;case 'ArrowRight':case 'KeyD':moveRight=false;break;}};document.addEventListener('keydown',onKeyDown);document.addEventListener('keyup',onKeyUp);let prevTime=performance.now();function animate(){requestAnimationFrame(animate);const time=performance.now();const delta=(time-prevTime)/1000;if(controls.isLocked===true){velocity.x-=velocity.x*10.0*delta;velocity.z-=velocity.z*10.0*delta;velocity.y-=9.8*100.0*delta;direction.z=Number(moveForward)-Number(moveBackward);direction.x=Number(moveRight)-Number(moveLeft);direction.normalize();if(moveForward||moveBackward)velocity.z-=direction.z*400.0*delta;if(moveLeft||moveRight)velocity.x-=direction.x*400.0*delta;controls.moveRight(-velocity.x*delta);controls.moveForward(-velocity.z*delta);camera.position.y+=(velocity.y*delta);if(camera.position.y<1){velocity.y=0;camera.position.y=1;canJump=true;}}prevTime=time;renderer.render(scene,camera);}animate();</script></body></html>`;
            return res.status(200).json({ reply: "Initializing Voxel Engine... Here is your Minecraft clone:\n\n```html\n" + minecraftCode + "\n```" });
        }

        if (!apiKey) return res.status(500).json({ error: "API Key is missing." });

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are Vessy, created by Athul. If asked for code, wrap it in markdown blocks." },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        return res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
