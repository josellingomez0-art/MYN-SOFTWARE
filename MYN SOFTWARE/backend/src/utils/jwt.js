const jwt = require("jsonwebtoken");

function generarToken(usuario) {

    return jwt.sign(
        {
            id: usuario.id,
            rol: usuario.id_rol,
            correo: usuario.correo
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );

}

module.exports = {
    generarToken
};