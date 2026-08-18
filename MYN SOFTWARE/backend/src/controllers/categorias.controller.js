const categoriasModel = require("../models/categorias.model");

async function listarCategorias(req, res) {

    try {

        const categorias = await categoriasModel.obtenerCategorias();

        res.json(categorias);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al listar categorías"
        });

    }

}

async function obtenerCategoria(req, res) {

    try {

        const categoria = await categoriasModel.obtenerCategoriaPorId(req.params.id);

        if (!categoria) {

            return res.status(404).json({
                mensaje: "Categoría no encontrada"
            });

        }

        res.json(categoria);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al consultar categoría"
        });

    }

}

async function crearCategoria(req, res) {

    try {

        const resultado = await categoriasModel.crearCategoria(req.body);

        res.status(201).json({

            mensaje: "Categoría creada correctamente",
            id: resultado.insertId

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            mensaje: "Error al crear categoría"

        });

    }

}

async function actualizarCategoria(req, res) {

    try {

        await categoriasModel.actualizarCategoria(
            req.params.id,
            req.body
        );

        res.json({

            mensaje: "Categoría actualizada correctamente"

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            mensaje: "Error al actualizar categoría"

        });

    }

}

async function eliminarCategoria(req, res) {

    try {

        await categoriasModel.eliminarCategoria(req.params.id);

        res.json({

            mensaje: "Categoría eliminada correctamente"

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            mensaje: "Error al eliminar categoría"

        });

    }

}

module.exports = {

    listarCategorias,
    obtenerCategoria,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria

};