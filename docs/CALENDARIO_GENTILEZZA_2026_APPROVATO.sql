-- Contenuti approvati dal Comitato di Monza il 11/11/2026.
-- Aggiorna solo i 24 giorni esistenti: non modifica la logica di sblocco.
WITH approved(day,title,message) AS (VALUES
(1,'Un grazie speciale','Pensa a una persona che fa qualcosa di bello per te. Oggi non dirle soltanto «grazie»: raccontale esattamente perché il suo gesto è importante.'),
(2,'Cinque minuti tutti per te','Dedica cinque minuti a qualcuno, senza guardare il telefono e senza interromperlo. A volte ascoltare è già un regalo.'),
(3,'Il piccolo favore','Cerca una cosa semplice che puoi fare per alleggerire la giornata di qualcuno. Fallo senza aspettare che te lo chiedano.'),
(4,'Un messaggio dal cuore','Scrivi a una persona che non senti da un po''. Bastano poche parole sincere: «Oggi ti ho pensato».'),
(5,'La porta aperta','Oggi fai attenzione a chi ti sta intorno: tieni una porta, lascia passare qualcuno, offri una mano. Le piccole cortesie contano.'),
(6,'Un posto anche per te','Durante un gioco, una conversazione o un’attività, prova a coinvolgere qualcuno che è rimasto in disparte. Senza forzare: basta un invito.'),
(7,'La parola che incoraggia','Qualcuno sta facendo fatica a imparare qualcosa? Invece di correggere soltanto l’errore, riconosci il suo impegno.'),
(8,'Un regalo fatto da te','Prepara un piccolo disegno, un biglietto o una decorazione con quello che hai in casa. Regalalo a qualcuno senza aspettare un’occasione speciale.'),
(9,'La gentilezza invisibile','Sistema uno spazio che usate in tanti: un tavolo, una stanza, un angolo comune. Questa volta senza annunciarlo a nessuno.'),
(10,'Una storia da condividere','Racconta a qualcuno un ricordo felice, oppure chiedigli di raccontarti il suo. Il regalo di oggi è ascoltare una storia.'),
(11,'Un posto a sedere','Se sei su un mezzo pubblico o in un luogo affollato, guarda se qualcuno avrebbe più bisogno di stare seduto. Quando puoi, offrigli il tuo posto.'),
(12,'Il complimento vero','Fai un complimento sincero a qualcuno per una sua qualità, non per il suo aspetto. Spiega cosa apprezzi di quella persona.'),
(13,'Un pezzetto di città più bello','Durante una passeggiata a Monza o dove abiti, raccogli un piccolo rifiuto pulito e sicuro, con l’aiuto di un adulto se sei un bambino. Non toccare oggetti taglienti o sconosciuti.'),
(14,'Condividi quello che sai','Sai fare qualcosa che per te è facile? Una ricetta, un disegno, un piccolo trucco? Insegnalo con pazienza a qualcuno.'),
(15,'Grazie a chi non si vede','Pensa a chi rende migliore la tua giornata con il proprio lavoro: chi pulisce, consegna, assiste, prepara o aggiusta. Oggi fagli arrivare un grazie autentico.'),
(16,'Una cosa buona da non sprecare','Oggi prova a evitare un piccolo spreco: usa gli avanzi, spegni una luce inutile o conserva qualcosa che può ancora servire.'),
(17,'Il dono di un libro','Scegli un libro che ti è piaciuto e consiglialo a qualcuno spiegando perché. Se puoi, prestaglielo.'),
(18,'La giornata della pazienza','Quando qualcosa va storto o qualcuno è più lento di te, prova a regalargli qualche secondo di pazienza. Può cambiare il tono di un’intera giornata.'),
(19,'Un aiuto su misura','Chiedi a una persona vicina: «C’è una piccola cosa in cui posso aiutarti oggi?». Ascolta la risposta, anche se è diversa da quello che immaginavi.'),
(20,'Gentilezza anche online','Scrivi un commento positivo e sincero per valorizzare il lavoro di qualcuno. Oggi usa lo schermo per far stare bene una persona.'),
(21,'Dieci minuti insieme','Invita qualcuno a fare qualcosa di semplice con te: una passeggiata, una tisana, un gioco o quattro chiacchiere. Senza fretta.'),
(22,'Un oggetto, una nuova possibilità','Trova a casa un oggetto in buono stato che non usi più. Valuta con un adulto o con la famiglia se può essere donato a qualcuno che ne avrebbe davvero piacere.'),
(23,'Passa la gentilezza','Racconta a qualcuno il gesto gentile più bello che hai ricevuto quest’anno. Poi invitalo a ricordarne uno a sua volta.'),
(24,'Il regalo che resta','Pensa a una persona a cui vuoi bene e falle sapere che cosa rende speciale la sua presenza nella tua vita. Non serve un pacchetto. Non serve spendere nulla. Buon Natale: la gentilezza continua anche domani.')
), updated AS (
 UPDATE public.kindness_doors d SET title = a.title, message = a.message
 FROM approved a WHERE d.day = a.day RETURNING d.day
)
SELECT count(*)::integer AS updated_days FROM updated;
