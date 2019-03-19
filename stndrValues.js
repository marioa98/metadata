const express = require('express');
const mysql = require('mysql');
const stnd = require("standarize-component");
const fuzz = require('fuzzball');

//Conexion a base de datos
function getConnection() {
    let con = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'password',
        database: 'metadata_clone'
    });

    //vStndr(con); //Primera fase de estandarizado
    compareStrings(con);
}

//Estandarizacion de valores y almacenamiento en tabla autoresEstandarizados
function vStndr(con) {

    con.query("SELECT idAutores, NombreCompleto, Repositorio FROM autores WHERE idAutores > 590900", function (err, result, fields) {

        //aqui se ejecutará el proceso de estandarizacion y se agregará a una nueva tabla  

        result.forEach(element => {
            let nombre = element[`NombreCompleto`];
            nombre = nombre.toUpperCase();
            let inegi = nombre.indexOf('INEGI');

            //Compara las posibles variaciones de INEGI, así como caracter especial ('*')
            if (inegi != -1) {
                nombre = 'INEGI';
            } else {
                nombre = stnd(nombre);
                inegi = nombre.indexOf('INSTITUTO NACIONAL DE ESTADISTICA Y GEOGRAFIA');
                if (inegi != -1) {
                    nombre = 'INEGI';
                } else {

                    inegi = nombre.indexOf('INSTITUTO NACIONAL DE ESTADISTICA GEOGRAFIA E INFORMATICA');
                    if (inegi != -1) {
                        nombre = 'INEGI';
                    } else {
                        let stnd = nombre.split('*');
                        if (stnd != -1) {
                            nombre = stnd[0];
                        }
                    }

                }
            }

            insertValues(con, element[`idAutores`], nombre, element[`Repositorio`]);

        });
    });

    secondStand(con); //Segunda fase de estandarizado

}

/*Se inserta a la tabla de autores estandarizados los elementos de la tabla despues de haber pasado por la primer etapa de estandarizacion*/
function insertValues(con, idAutores, NombreCompleto, Repositorio) {
    con.query(`INSERT INTO autoresestandarizados(idAutor, nombreCompleto, repositorio) VALUES(${idAutores},
        "${NombreCompleto}", "${Repositorio}")`);
}


/*Esta función es la segunda etapa de estandarizado, aqui se quitará el contenido entre parentesis, asi como caracteres especiales no 
válidos */

function secondStand(con) {

    con.query("SELECT idAutor, nombreCompleto FROM autoresestandarizados", function (err, result, fields) {
        result.forEach(element => {
            let nombre = element[`nombreCompleto`];
            let start = nombre.indexOf('-');
            let begin = nombre.indexOf('(');
            let begin2 = nombre.indexOf('[');
            let num = nombre.indexOf(/[0-9]+/);

            if (start == 0) {
                nombre = nombre.replace('-', ' '); //Elimina un posible guión al inicio del registro
                updateValues(con, element[`idAutor`], nombre);
            } else if (begin != -1) {
                nombre = nombre.replace(/\(([^)]+)\)/, ''); //Elimina paréntesis y su contenido}
                updateValues(con, element[`idAutor`], nombre);
            } else if (begin2 != -1) {
                nombre = nombre.replace(/\[([^)]+)\]/, ''); //Elimina corchetes y su contenido
                updateValues(con, element[`idAutor`], nombre);
            } else if (num != null) {
                nombre = nombre.replace(/[0-9]+/g, ''); //<AUN FALTA MEJORAR ESTE METODO>
                updateValues(con, element[`idAutor`], nombre);
            }

        });

    });

}

/* Actualiza los valores despues de la segunda actualización (solo los valores que cumplieron alguna 
    condición)*/
function updateValues(con, idAutor, nombreCompleto) {
    con.query(`UPDATE autoresestandarizados SET nombreCompleto = "${nombreCompleto}" WHERE idAutor = "${idAutor}"`);
}

/* Dentro de este método se van a comparar todos los registros contra todos los registros, utilizando la librería
fuzzball (el método partial ratio y ratio), el cual consiste en determinar el porcentaje de coincidencia de una subcadena
en otra cadena y el promedio de coincidencia entre dos cadenas.
Sí el promedio de ambos métodos es de 90, se integrará a autoresUnicos, de lo contrario se agregará a autoresEliminados*/

function compareStrings(con) {
    con.query('SELECT idAutor, nombreCompleto, repositorio FROM autoresestandarizados', function (err, result, fields) {

        for (let index = 0; index < result.length - 1; index++) {
            let iguales = [];
            this.iguales = result[index];
            for (let index2 = index + 1; index2 < result.length; index2++) {
                let fuzzy = fuzz.partial_ratio(result[index].nombreCompleto, result[index2].nombreCompleto);
                const ratio = fuzz.ratio(result[index].nombreCompleto, result[index2].nombreCompleto);

                fuzzy = (fuzzy + ratio) / 2;

                if (fuzzy >= 90) {
                    iguales = iguales.concat(result[index2]);
                }
            }
            chooseBestValue(con, iguales); //Manda una cadena con los elementos iguales
        }
    });
}

function chooseBestValue(con, element) {

    let posicion = 0;

    for (let index = 0; index < (element.length - 1); index++) {
        for (let index2 = index + 1; index2 < element.length; index2++) {
            const nombre1 = element[index].nombreCompleto;
            const nombre2 = element[index2].nombreCompleto;

            if (nombre1.length > nombre2.length) {
                posicion = index;
            }
        }
    }

    uniqElement(con, element[posicion]);
}

function uniqElement(con, elements) {
    let add = true;
    let idAutor = elements[`idAutor`];
    let nombreCompleto = elements[`nombreCompleto`];
    let repositorio = elements[`repositorio`];

    con.query(`SELECT idAutor, nombreCompleto FROM autoresunicos WHERE idAutor = '${idAutor} OR nombreCompleto = ${nombreCompleto}'`, function (err, result, fields) {
        if (result.length > 0) {
            add = false;
        }
    });

    console.log(add);

    // if (add == true) {
    //     con.query(`INSERT INTO autoresunicos(idAutor, nombreCompleto, repositorio) VALUES('${idAutor}','${nombreCompleto}', '${repositorio}')`);
    // }
}

function deletedElements(con, elements, idNuevo) {

    let add = true;

    for (let index = 0; index < array.length; index++) {
        const element = array[index];

    }
}

// function uniqElement(con, e) {
//     let add;
//     e = e.split('%'); //Hasta aqui si funciona.
//     let idAutor = e[0];
//     let nombreCompleto = e[1];
//     let repositorio = e[2];

//     console.log('puto');
//     //==================================================================================================

//     //Apartir de aqui se encontró el error.
//     //Se verifica que el autor no haya sido agregado de manera previa
//     con.query('SELECT idAutor, nombreCompleto FROM autoreestandarizados', function (err, result, fields) {
//         console.log('EWE');
//         result.forEach(element => {
//             let fuzzy = fuzz.partial_ratio(nombreCompleto, element[`nombreCompleto`]);
//             let ratio = fuzz.ratio(nombreCompleto, element[`nombreCompleto`]);

//             fuzzy = (fuzzy + ratio) / 2;
//             if (idAutor == element[`idAutor`] && fuzzy > 90) {
//                 add = false;
//             } else {
//                 add = true;
//             }
//         });
//     });

//     console.log(add);
//     if (add == true) {
//         con.query(`INSERT INTO autoresunicos(idAutor, nombreCompleto, repositorio) VALUES("${idAutor}","${nombreCompleto}"
//         , "${repositorio}")`);
//     }
// }

// function deletedElement(con, elements, idNuevo) {

//     elements.forEach(element => {
//         element = element.split('%');
//         let idAutor = element[0];
//         let nombreCompleto = element[1];
//         let repositorio = element[2];
//         let add = true;

//         //Verifica que no se haya registros duplicados
//         con.query('SELECT idAutor FROM autoreseliminados', function (err, result, fields) {
//             result.forEach(e => {
//                 if (idAutor == e[`idAutor`]) {
//                     add = false;
//                 }
//             });
//         });

//         if (add == true) {
//             con.query(`INSERT INTO autoreseliminados(idAutor, nombreCompleto, idNuevo, repoOriginal) 
//             VALUES("${idAutor}", "${nombreCompleto}", "${idNuevo}", "${repositorio}")`);
//         }
//     });
// }

getConnection();