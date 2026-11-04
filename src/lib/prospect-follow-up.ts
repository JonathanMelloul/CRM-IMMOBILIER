export function prospectFollowUpMessage(name:string):string {
 const recipient=name.replace(/\s+/g,' ').trim();
 return `${recipient?`Bonjour ${recipient},`:'Bonjour,'}

Nous avons essayé de vous joindre au sujet de votre projet immobilier en Israël.

Vous souhaitez y vivre, préparer votre installation ou investir ? L’équipe Yonathan Immobilier vous accompagne pour trouver un bien adapté à vos envies et à votre budget.

Quand seriez-vous disponible pour un court échange ? Vous pouvez aussi nous indiquer la ville recherchée et votre budget par retour de message : nous pourrons ainsi mieux cibler votre recherche.

Au plaisir d’échanger avec vous,
L’équipe Yonathan Immobilier`;
}
