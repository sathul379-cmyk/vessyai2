export async function onRequestPost(context) {
    try {
        // 1. Get Data (Cloudflare style)
        const { request, env } = context;
        const { prompt } = await request.json();
        
        // 2. Check API Key (env instead of process.env)
        const apiKey = env.GROQ_API_KEY;
        
        // --- MINECRAFT ENGINE ---
        if (prompt.toLowerCase().includes("minecraft") || prompt.toLowerCase().includes("build a game")) {
            const minecraftCode = `<!DOCTYPE html><html><head><title>VessyCraft CF</title><style>body{margin:0;overflow:hidden;font-family:monospace;}#ui{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:white;text-align:center;pointer-events:none;}#crosshair{position:absolute;top:50%;left:50%;width:20px;height:20px;border:2px solid white;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;}#instructions{position:absolute;top:10px;left:10px;color:white;background:rgba(0,0,0,0.5);padding:10px;}</style></head><body><div id="crosshair"></div><div id="instructions"><b>VessyCraft Cloud</b><br>Click to Start<br>WASD: Move | Space: Jump<br>Click: Add | Shift+Click: Break</div><div id="ui"><h1>CLICK TO PLAY</h1></div><script type="module">import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';import { PointerLockControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';const scene=new THREE.Scene();scene.background=new THREE.Color(0x87CEEB);scene.fog=new THREE.Fog(0x87CEEB,10,60);const camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(window.innerWidth,window.innerHeight);document.body.appendChild(renderer.domElement);const ambient=new THREE.AmbientLight(0xffffff,0.6);scene.add(ambient);const sun=new THREE.DirectionalLight(0xffffff,0.8);sun.position.set(50,50,50);scene.add(sun);const grassMat=new THREE.MeshLambertMaterial({color:0x55aa55});const dirtMat=new THREE.MeshLambertMaterial({color:0x885533});const geometry=new THREE.BoxGeometry(1,1,1);const objects=[];for(let x=-10;x<10;x++){for(let z=-10;z<10;z++){const voxel=new THREE.Mesh(geometry,grassMat);voxel.position.set(x,-1,z);scene.add(voxel);objects.push(voxel);}}const controls=new PointerLockControls(camera,document.body);document.body.addEventListener('click',()=>{controls.lock();document.getElementById('ui').style.display='none';});controls.addEventListener('unlock',()=>{document.getElementById('ui').style.display='block';});const raycaster=new THREE.Raycaster();document.addEventListener('mousedown',(e)=>{if(!controls.isLocked)return;raycaster.setFromCamera(new THREE.Vector2(0,0),camera);const intersects=raycaster.intersectObjects(objects);if(intersects.length>0){const intersect=intersects[0];if(e.shiftKey){if(intersect.object.position.y!==-1){scene.remove(intersect.object);objects.splice(objects.indexOf(intersect.object),1);}}else{const voxel=new THREE.Mesh(geometry,dirtMat);voxel.position.copy(intersect.point).add(intersect.face.normal);voxel.position.divideScalar(1).floor().multiplyScalar(1).addScalar(0.5);scene.add(voxel);objects.push(voxel);}}});const velocity=new THREE.Vector3();const direction=new THREE.Vector3();let moveF=false,moveB=false,moveL=false,moveR=false,canJump=false;document.addEventListener('keydown',(e)=>{switch(e.code){case 'KeyW':moveF=true;break;case 'KeyS':moveB=true;break;case 'KeyA':moveL=true;break;case 'KeyD':moveR=true;break;case 'Space':if(canJump)velocity.y+=20;canJump=false;break;}});document.addEventListener('keyup',(e)=>{switch(e.code){case 'KeyW':moveF=false;break;case 'KeyS':moveB=false;break;case 'KeyA':moveL=false;break;case 'KeyD':moveR=false;break;}});let prevTime=performance.now();function animate(){requestAnimationFrame(animate);const time=performance.now();const delta=(time-prevTime)/1000;prevTime=time;if(controls.isLocked){velocity.x-=velocity.x*10.0*delta;velocity.z-=velocity.z*10.0*delta;velocity.y-=50.0*delta;direction.z=Number(moveF)-Number(moveB);direction.x=Number(moveR)-Number(moveL);direction.normalize();if(moveF||moveB)velocity.z-=direction.z*100.0*delta;if(moveLeft||moveRight)velocity.x-=direction.x*100.0*delta;controls.moveRight(-velocity.x*delta);controls.moveForward(-velocity.z*delta);camera.position.y+=(velocity.y*delta);if(camera.position.y<1){velocity.y=0;camera.position.y=1;canJump=true;}}renderer.render(scene,camera);}animate();</script></body></html>`;
            return new Response(JSON.stringify({ reply: "Initializing Voxel Engine (Cloudflare)... \n\n```html\n" + minecraftCode + "\n```" }));
        }

        if (!apiKey) return new Response(JSON.stringify({ error: "API Key is missing." }), { status: 500 });

        // 3. Call Groq
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are Vessy OS 30.1 made by Athul Sanoj (Cloudflare Edition). you should be smart quick but correct and talk in an smart tone. Wrap code in markdown." },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        return new Response(JSON.stringify({ reply: data.choices[0].message.content }));

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
