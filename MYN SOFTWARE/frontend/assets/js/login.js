async function login(){

    const usuario=document.getElementById("usuario");

    const password=document.getElementById("password");

    const error=document.getElementById("error");

    const boton=document.getElementById("btnLogin");

    if(usuario.value.trim()===""){

        error.textContent="Ingrese el correo";

        usuario.focus();

        return;

    }

    if(password.value.trim()===""){

        error.textContent="Ingrese la contraseña";

        password.focus();

        return;

    }

    error.textContent="";

    boton.disabled=true;

    boton.textContent="Ingresando...";

    try{

        const respuesta=await peticion("/auth/login","POST",{
            correo:usuario.value.trim(),
            password:password.value
        });

        if(!respuesta.token){

            error.textContent=respuesta.mensaje || "Credenciales incorrectas";
            return;

        }

        localStorage.setItem("token",respuesta.token);

        sessionStorage.setItem("usuario",
            `${respuesta.usuario.nombres} ${respuesta.usuario.apellidos}`);

        sessionStorage.setItem("idUsuario",respuesta.usuario.id);

        sessionStorage.setItem("rol",respuesta.usuario.rol);

        try{

            const permisos = await peticion("/permisos/mios");

            sessionStorage.setItem("permisos", JSON.stringify(permisos));

        }catch(e){

            console.error("No se pudieron cargar los permisos", e);
            sessionStorage.setItem("permisos", JSON.stringify([]));

        }

        abrirModulo("dashboard");

    }catch(e){

        console.error(e);

        error.textContent="No fue posible conectar con el servidor";

    }finally{

        boton.disabled=false;

        boton.textContent="Ingresar";

    }

}
