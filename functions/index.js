const functions = require('firebase-functions');
const admin = require('firebase-admin');
const differenceInHours = require('date-fns/difference_in_hours')

admin.initializeApp();

exports.calcularCostoParqueadero = functions.https.onCall(async (data, context) => {

    const idEntrada = data.idEntrada;
    const fechaSalida = new Date();
    console.log(context.auth);

    const entradaData = await admin.firestore()
        .collection('entradas')
        .doc(idEntrada)
        .get();

    const fechaEntrada = entradaData.data().fecha.toDate()
    const horasPagar = parseInt(differenceInHours(fechaSalida, fechaEntrada));
    console.log(`Horas a pagar => ${horasPagar}`);
    const costo = horasPagar * 2000;

    return {
        horasPagar: horasPagar,
        costo: costo
    }
})

exports.registrarTokenToTopico = functions.firestore.document("/tokens/{id}")
    .onCreate(dataSnapshot => {
        const token = dataSnapshot.data().token;
        const tokens = [];
        tokens.push(token);
        console.log(token);
        return admin
            .messaging()
            .subscribeToTopic(tokens, "parqueaderosdisponibles")
            .catch(error => {
                return console.error(error);
            });
    });

exports.enviarNotificacionParqueaderoLibres = functions.firestore
    .document("/parqueaderos/{id}")
    .onUpdate((change, context) => {
        const libre = change.after.data().libre;

        if (libre) {
            console.log("Enviar Notificación");
            const mensaje = {
                data: {
                    nombreparqueadero: change.after.data().nombre
                },
                topic: 'parqueaderosdisponibles'
            }

            console.log(mensaje);

            return admin
                .messaging()
                .send(mensaje)
                .then((response) => {
                    return console.log('Successfully sent message:', response);
                })
                .catch(error => {
                    return console.error(error);
                });
        }

        return true;
    })
