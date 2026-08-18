const bcrypt = require("bcryptjs");
const authModel = require("./auth.model");
const { generarToken } = require("../utils/jwt");

async function login(req, res) {

    try {

        const { correo, password } = req.body;

        const usuario = await authModel.buscarPorCorreo(correo);

        if (!usuario) {

            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });

        }

        const valido = await bcrypt.compare(
            password,
            usuario.password
        );

        if (!valido) {

            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });

        }

        const token = generarToken(usuario);

        res.json({

            mensaje: "Login correcto",

            token,

            usuario: {

                id: usuario.id,

                nombres: usuario.nombres,

                apellidos: usuario.apellidos,

                correo: usuario.correo,

                rol: usuario.rol_nombre

            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            mensaje: "Error interno"

        });

    }

}

module.exports = {
    login
};