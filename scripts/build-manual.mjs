#!/usr/bin/env node
// User manual in two languages from ONE structure: manual/index.html (English) and es/manual/index.html (Spanish).
// Both share the screenshots in manual/img/ (the app's interface is in Spanish). Run: node scripts/build-manual.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SITE = "https://licenroute.com";
const CSS_V = "202611221500";
const UPDATED = "2026-11-22";
const DIMS = { 1: 820, 2: 820, 3: 820, 4: 1996, 5: 1771, 6: 1224, 7: 820, 8: 820, 9: 1491, 10: 820, 11: 935, 12: 820, 13: 1970, 14: 1255, 15: 1134, 16: 820, 17: 1256, 18: 820, 19: 820, 20: 820 };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// Inline marks in content strings: **bold** and `code`. Content is ours; everything else is escaped.
const inl = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>");

const P = (s) => ({ p: s });
const OL = (...items) => ({ ol: items });
const H3 = (s) => ({ h3: s });
const T = (head, ...rows) => ({ table: { head, rows } });
const F = (n, caption) => ({ fig: { n, caption } });
const CODE = (s) => ({ code: s });

const C = {
  en: {
    lang: "en", path: "/manual/", other: "/es/manual/", otherLabel: "Español", otherLang: "es",
    title: "User manual | LicenRoute", h1: "LicenRoute user manual",
    description: "How to publish and charge for your API with LicenRoute, and how buyers try and buy APIs in the Market. Step by step, with screenshots.",
    lead: "Publish your API, charge for it in your own Stripe account, and let people and AI agents try and buy it.",
    note: "The screenshots come from a local demo with sample data, and the app's interface is in Spanish. The panel and the Market are not online yet; payments run in Stripe test mode, with no real money.",
    updated: "Updated", toc: "Contents", home: "Home", skip: "Skip to content", guides: "Guides", manual: "Manual",
    legal: "The paid lane for your API. Apache-2.0 license. Developer preview in demo mode.", nav: "Main", footer: "Footer",
    sections: [
      ["what", "What LicenRoute is", [
        P("LicenRoute lets you charge for your API without building billing: each buyer gets a key with its quota, and you get paid in your own Stripe account."),
        T(["Who you are", "Where you work", "Sections"],
          ["Owner of an API: you publish it and charge for it", "LicenRoute panel (Central)", "Getting started to Serving your buyers"],
          ["Buyer: you look for an API, try it and buy it", "LicenRoute Market", "Buyer's guide"],
          ["AI assistant or agent looking for APIs", "Machine-readable catalogue and MCP server", "For AI agents"])]],
      ["start", "Getting started in the panel", [
        P("Sign in with your email and password; the panel opens on your organisation's Summary."),
        OL("Open the panel and enter your email and password.", "The Summary shows how many sites, active API keys and members your organisation has, and the first three steps.", "Use the top menu to move around."),
        F(1, "Signing in to the panel."), F(2, "Organisation summary."),
        T(["Menu", "What it is for"],
          ["Resumen (Summary)", "Organisation figures and first steps"], ["Sitios (Sites)", "Your APIs: domain, keys, plans and Market listings"],
          ["Compradores (Buyers)", "Who holds your licences and their usage"], ["Solicitudes Market (Market requests)", "Access requests to plans that need your approval"],
          ["Cobros (Payments)", "Your connected Stripe account"], ["Miembros (Members)", "Your team and their role (owner, admin, viewer)"],
          ["Auditoría (Audit)", "Log of every important change (admins and owner only)"]),
        P("The button with your organisation's name, top right, switches organisation if you belong to several.")]],
      ["register", "Registering your API and its plans", [
        P("Each API is a **site** with its domain; inside the site you define the **plans** you sell: which routes charge, at what price and with how much quota."),
        H3("The site"),
        OL("Go to **Sitios** and press **Nuevo sitio**: name, your API's domain and the consent.", "On the site page, create an **API key** (shown only once) and copy the three environment variables to your server.", "Usually your AI assistant makes the connection with the prompt from licenroute.com; you only approve the change in your terminal."),
        F(3, "Site list: one row per API."), F(4, "A site: details, environment variables and API keys."),
        H3("The plans"),
        P("The site's **Licencias** tab lists its plans; press **Editar** on one or create another."),
        F(5, "Plans of a site."), F(6, "Editing a plan."),
        T(["Field", "Meaning", "Example"],
          ["Licensed route", "Which routes the plan charges (glob)", "`/v1/**`"], ["Methods", "Which HTTP methods it charges; GET and HEAD share quota", "GET, HEAD"],
          ["Price and Per", "Price in cents per request or per 1,000", "300 per 1,000 = €3.00"], ["Quota", "Requests bought at once", "10,000 (= €30.00)"],
          ["Validity", "Days each licence lasts", "30"], ["Limit per licence", "Requests per minute; stops leaked keys", "60"],
          ["Sale in the Market", "**Instant purchase**: buyers pay and get the key at once. **With my approval**: they ask and you decide", "Instant purchase"],
          ["Free trial", "Free requests, once per buyer and plan, for 7 days", "50"]),
        P("The price buyers see is computed: quota × price. It is never typed by hand.")]],
      ["payments", "Getting paid in your Stripe account", [
        P("Sales are charged in your own Stripe account: the money goes straight to you, and LicenRoute never receives or holds it."),
        OL("Go to **Cobros** and press **Conectar mi cuenta de Stripe**. Only the organisation's owner can do it.", "Stripe asks for your details and your bank's. If you stop halfway, come back and press **Continuar en Stripe**.", "On your return the panel asks Stripe and shows the status. With **lista para cobrar** (ready to charge), your instant-purchase plans show the **Comprar** (Buy) button in the Market."),
        F(7, "Payments with a connected account, ready to charge."),
        T(["Status", "Meaning"],
          ["No connected account", "Your plans cannot be bought directly; buyers can only request access"], ["Onboarding not finished", "Stripe still needs details"],
          ["Submitted; Stripe is reviewing it", "Stripe does not allow charges yet"], ["Ready to charge", "Sales are charged in your account"]),
        P("Stripe's fees are charged to your account like any other payment of yours. **Comprobar estado en Stripe** checks the status again whenever you want.")]],
      ["publish", "Publishing your API in the Market", [
        P("The listing is what buyers see: only what you write in it, the domain and the plans you choose. It never shows your routes, limits, keys or policies."),
        OL("On the site, open the **Market** tab and press **Nueva ficha**.", "Fill in title, publisher, category, summary and description.", "Add the **documentation** (for example your `/openapi.json`), the **service status** if you have one, and an **example request and response**.", "Tick the plans you offer and choose the visibility.", "Save. With **Pública** visibility the listing appears in the catalogue."),
        F(8, "The site's listings in the Market."), F(9, "Editing a listing."),
        T(["Visibility", "Who sees it"], ["Hidden", "Nobody"], ["Link only", "Whoever has the private link (it can be regenerated)"], ["Public", "Anyone: the catalogue, `catalog.json` and licenroute.com/apis"]),
        P("In the example write `bgat_…` instead of a key: listings refuse keys with a real format. The **public page address** (for example `festivos-es`) comes from the title if you leave it empty. The listing also shows the requests served in the last 30 days, from real usage.")]],
      ["buyers", "Serving your buyers", [
        P("With instant purchase you do nothing: the buyer pays and gets the key. You only step in for plans **with your approval**, or to review or cut off access."),
        H3("Market requests"),
        OL("Open **Solicitudes Market**: pending requests first; filter by approved, rejected or withdrawn.", "Press **Revisar** to see who is asking, whether they verified their email, and why.", "**Aprobar** opens a Stripe payment for the buyer; the key is delivered only once the payment shows as paid. **Rechazar** closes the request. Either way you can leave a note, and the buyer gets an email."),
        F(10, "Request inbox."), F(11, "Reviewing a request."),
        H3("Buyers and licences"),
        P("**Compradores** lists everyone holding your licences, paid or trial. Open one to see their licences, the usage of each and the button to revoke them. A revoked licence stops working at once, without redeploying your API. A suspended buyer cannot buy or try your APIs, and is not told why."),
        F(12, "Buyers: Lucía appears when she starts her free trial.")]],
      ["guide", "Buyer's guide", [
        P("In the Market you find an API, try it for free and buy it in a minute. The key you get is sent with every request as `Authorization: Bearer bgat_…`."),
        H3("Finding an API"),
        P("The **Catálogo** lists public APIs, with search and a category filter. A listing shows what the API does, an example request and response, its documentation, the requests served in 30 days and its plans with the final price."),
        F(13, "The Market catalogue."), F(14, "A listing seen without signing in."),
        H3("Creating your account"),
        OL("Press **Crear cuenta**: name, email, a password of 12 characters or more, and accept the terms.", "Open the link in the email to verify the account. Unverified accounts cannot try, buy or request access.", "Sign in with your email and password."),
        F(15, "Sign-up."), F(16, "Signing in to the Market."),
        H3("Free trial and purchase"),
        P("Once signed in, each plan on the listing shows its buttons:"),
        T(["Button", "What happens"],
          ["**Probar gratis** (Try for free)", "You get a key at once with the trial quota (for example 50 requests for 7 days). One trial per plan, up to 3 a day"],
          ["**Comprar** (Buy)", "You go to Stripe's payment page. After paying you come back to a page that hands you the key once"],
          ["**Solicitar acceso** (Request access)", "For plans with approval: you explain what you need it for and the owner decides. If approved, you pay and get the key"]),
        F(17, "Listing when signed in: Buy and Try for free buttons."), F(18, "Trial key (hidden in the screenshot)."),
        P("**Copy the key as soon as you see it**: it is not shown again, because LicenRoute only stores a hash of it. If you lose it, the owner can revoke it and you get another one."),
        H3("Your purchases, trials and requests"),
        P("**Mis compras** shows each payment with its status (pending, paid, refunded…) and each trial with its usage. **Mis solicitudes** shows your access requests and the owner's decision. In **Mi cuenta** you change your details, download your data or delete the account."),
        F(19, "My purchases and trials.")]],
      ["agents", "For AI agents", [
        P("AI assistants can find and recommend Market APIs in two ways. Neither pays anything: the agent suggests and a person decides."),
        P("**1. The catalogue as JSON.** `GET /market/catalog.json` returns the public listings with their plans, prices, quotas and trials, in the `licenroute.market.catalog/v1` format. It has no internal routes, limits or keys."),
        F(20, "catalog.json in the browser."),
        P("**2. The MCP server.** `packages/market-mcp` has no dependencies and offers three tools:"),
        T(["Tool", "What it returns"], ["`search_apis`", "APIs that match what you ask for (\"spanish holidays\", \"validate NIF\"), with the lowest price"],
          ["`get_api`", "Everything about one API: description, example, real usage and plans"], ["`request_purchase`", "The link where a person starts the trial or buys"]),
        P("To connect it in Claude Code:"),
        CODE("claude mcp add licenroute-market -e LICENROUTE_MARKET_URL=https://<your-market>/market -- node <path>/packages/market-mcp/bin/licenroute-market-mcp.mjs"),
        P("In Cursor, add the same to `.cursor/mcp.json`; the package README has the example.")]],
      ["faq", "Questions and current limits", [
        P("**Is real money charged?** No. Everything runs in Stripe test mode today: you can pay with test cards and no money moves."),
        P("**Can I use it with real customers now?** Not yet. The panel and the Market run locally; the public server is the next step."),
        P("**What if LicenRoute does not answer?** Your API's paid routes return 503 until it is back; public routes keep working."),
        P("**I lost my key.** It cannot be recovered: only a hash is stored. Ask the owner to revoke it and get another one."),
        P("**What does a paid route answer?** No key: 402 with the plan and the purchase link. Valid key: 200. Invented or revoked key: 403. Quota used up: 402."),
        P("**Which technologies are supported?** Node.js APIs with Express 4 or 5. For other frameworks, tell us on licenroute.com.")]]
    ]
  },
  es: {
    lang: "es", path: "/es/manual/", other: "/manual/", otherLabel: "English", otherLang: "en",
    title: "Manual de usuario | LicenRoute", h1: "Manual de usuario de LicenRoute",
    description: "Cómo publicar y cobrar por tu API con LicenRoute, y cómo los compradores prueban y compran APIs en el Market. Paso a paso, con pantallazos.",
    lead: "Publica tu API, cobra por ella en tu propia cuenta de Stripe y deja que personas y agentes de IA la prueben y la compren.",
    note: "Los pantallazos son de una demostración local con datos de ejemplo. El panel y el Market aún no están en línea; los pagos funcionan en modo de pruebas de Stripe, sin dinero real.",
    updated: "Actualizado", toc: "Contenido", home: "Inicio", skip: "Saltar al contenido", guides: "Guías", manual: "Manual",
    legal: "El carril de pago de tu API. Licencia Apache-2.0. Versión preliminar en modo demo.", nav: "Principal", footer: "Pie",
    sections: [
      ["what", "Qué es LicenRoute", [
        P("LicenRoute te permite cobrar por tu API sin montar facturación: cada comprador recibe una clave con su cuota, y tú cobras en tu propia cuenta de Stripe."),
        T(["Quién eres", "Dónde trabajas", "Secciones"],
          ["Dueño de una API: la publicas y cobras por ella", "Panel de LicenRoute (Central)", "Primeros pasos a Atender a tus compradores"],
          ["Comprador: buscas una API, la pruebas y la compras", "LicenRoute Market", "Guía del comprador"],
          ["Asistente o agente de IA que busca APIs", "Catálogo legible por máquinas y servidor MCP", "Para agentes de IA"])]],
      ["start", "Primeros pasos en el panel", [
        P("Entra con tu correo y contraseña; el panel abre en el Resumen de tu organización."),
        OL("Abre el panel e introduce tu correo y tu contraseña.", "En el Resumen ves cuántos sitios, API keys activas y miembros tiene tu organización, y los tres primeros pasos.", "Usa el menú superior para moverte."),
        F(1, "Entrada al panel."), F(2, "Resumen de la organización."),
        T(["Menú", "Para qué sirve"],
          ["Resumen", "Cifras de la organización y primeros pasos"], ["Sitios", "Tus APIs: dominio, claves, planes y fichas del Market"],
          ["Compradores", "Quién tiene licencias tuyas y su uso"], ["Solicitudes Market", "Peticiones de acceso a planes con aprobación manual"],
          ["Cobros", "Tu cuenta de Stripe conectada"], ["Miembros", "Personas de tu equipo y su rol (propietario, admin, lector)"],
          ["Auditoría", "Registro de cada cambio importante (solo admin y propietario)"]),
        P("El botón con el nombre de la organización, arriba a la derecha, cambia de organización si perteneces a varias.")]],
      ["register", "Registrar tu API y sus planes", [
        P("Cada API es un **sitio** con su dominio; dentro del sitio defines los **planes** que se venden: qué rutas cobran, a qué precio y con cuánta cuota."),
        H3("El sitio"),
        OL("Ve a **Sitios** y pulsa **Nuevo sitio**: nombre, dominio de tu API y aceptación del consentimiento.", "En la página del sitio, crea una **API key** (se muestra una sola vez) y copia las tres variables de entorno a tu servidor.", "Lo normal es que tu asistente de IA haga la conexión con el prompt de licenroute.com; tú solo apruebas el cambio en tu terminal."),
        F(3, "Lista de sitios: una fila por API."), F(4, "Página de un sitio: datos, variables de entorno y API keys."),
        H3("Los planes"),
        P("En la pestaña **Licencias** del sitio ves sus planes; pulsa **Editar** en uno o crea otro."),
        F(5, "Planes de un sitio."), F(6, "Edición de un plan."),
        T(["Campo", "Qué significa", "Ejemplo"],
          ["Ruta licenciada", "Qué rutas cobra el plan (glob)", "`/v1/**`"], ["Métodos", "Qué métodos HTTP cobra; GET y HEAD comparten cuota", "GET, HEAD"],
          ["Precio y Por cada", "Precio en céntimos por petición o por 1.000", "300 por 1.000 = 3,00 €"], ["Cuota", "Peticiones que se compran de una vez", "10.000 (= 30,00 €)"],
          ["Vigencia", "Días que dura cada licencia", "30"], ["Límite por licencia", "Peticiones por minuto; frena claves filtradas", "60"],
          ["Venta en el Market", "**Compra instantánea**: pagan y reciben la clave al momento. **Con mi aprobación**: te piden acceso y decides", "Compra instantánea"],
          ["Prueba gratuita", "Peticiones gratis, una vez por comprador y plan, durante 7 días", "50"]),
        P("El precio que ve el comprador se calcula solo: cuota × precio. Nunca se escribe a mano.")]],
      ["payments", "Cobrar en tu cuenta de Stripe", [
        P("Las ventas se cobran en tu propia cuenta de Stripe: el dinero va directo a ti y LicenRoute no lo recibe ni lo retiene."),
        OL("Ve a **Cobros** y pulsa **Conectar mi cuenta de Stripe**. Solo puede hacerlo la persona propietaria de la organización.", "Stripe te pide tus datos y los de tu banco. Si lo dejas a medias, vuelve y pulsa **Continuar en Stripe**.", "Al volver, el panel consulta a Stripe y muestra el estado. Con **lista para cobrar**, tus planes de compra instantánea muestran el botón **Comprar** en el Market."),
        F(7, "Cobros con una cuenta conectada y lista para cobrar."),
        T(["Estado", "Qué significa"],
          ["Sin cuenta conectada", "Tus planes no se pueden comprar directamente; los compradores solo pueden solicitar acceso"], ["Alta sin terminar", "Faltan datos en Stripe"],
          ["Alta enviada; Stripe la está revisando", "Stripe aún no permite cobros"], ["Lista para cobrar", "Las ventas se cobran en tu cuenta"]),
        P("Las comisiones de Stripe se cargan en tu cuenta como cualquier otro cobro tuyo. **Comprobar estado en Stripe** vuelve a consultar el estado cuando quieras.")]],
      ["publish", "Publicar tu API en el Market", [
        P("La ficha es lo que ven los compradores: solo muestra lo que escribes en ella, el dominio y los planes que eliges. Nunca muestra tus rutas, límites, claves ni políticas."),
        OL("En el sitio, abre la pestaña **Market** y pulsa **Nueva ficha**.", "Rellena título, editor, categoría, resumen y descripción.", "Añade la **documentación** (por ejemplo tu `/openapi.json`), el **estado del servicio** si lo tienes y un **ejemplo de petición y respuesta**.", "Marca los planes que ofreces y elige la visibilidad.", "Guarda. Con visibilidad **Pública**, la ficha aparece en el catálogo."),
        F(8, "Fichas del sitio en el Market."), F(9, "Edición de una ficha."),
        T(["Visibilidad", "Quién la ve"], ["Oculta", "Nadie"], ["Solo con enlace", "Quien tenga el enlace privado (se puede regenerar)"], ["Pública", "Cualquiera: el catálogo, `catalog.json` y licenroute.com/apis"]),
        P("En el ejemplo escribe `bgat_…` en lugar de una clave: la ficha rechaza las claves con formato real. La **dirección de la página pública** (por ejemplo `festivos-es`) se genera a partir del título si la dejas vacía. La ficha muestra también las peticiones servidas en los últimos 30 días, calculadas a partir del uso real.")]],
      ["buyers", "Atender a tus compradores", [
        P("Con compra instantánea no tienes que hacer nada: el comprador paga y recibe su clave. Solo intervienes en los planes **con tu aprobación** y cuando quieres revisar o cortar un acceso."),
        H3("Solicitudes del Market"),
        OL("Abre **Solicitudes Market**: las pendientes salen primero y puedes filtrar por aprobadas, rechazadas o retiradas.", "Pulsa **Revisar** para ver quién pide acceso, si ha verificado su correo y el motivo.", "**Aprobar** abre un pago de Stripe para el comprador; la clave solo se entrega cuando el pago consta como pagado. **Rechazar** cierra la solicitud. En los dos casos puedes dejar una nota, y el comprador recibe un correo."),
        F(10, "Bandeja de solicitudes."), F(11, "Revisión de una solicitud."),
        H3("Compradores y licencias"),
        P("En **Compradores** está cada persona con licencias tuyas, tanto de pago como de prueba. Al entrar en uno ves sus licencias, el uso de cada una y el botón para revocarlas. Una licencia revocada deja de funcionar en el acto, sin redesplegar tu API. Si suspendes a un comprador, no puede comprar ni probar tus APIs, y no se le dice por qué."),
        F(12, "Compradores: Lucía aparece al activar su prueba gratuita.")]],
      ["guide", "Guía del comprador", [
        P("En el Market buscas una API, la pruebas gratis y la compras en un minuto. La clave que recibes se envía en cada petición como `Authorization: Bearer bgat_…`."),
        H3("Encontrar una API"),
        P("El **Catálogo** lista las APIs públicas, con un buscador y un filtro por categoría. Al abrir una ficha ves qué hace, un ejemplo de petición y respuesta, la documentación, las peticiones servidas en 30 días y sus planes con el precio final."),
        F(13, "Catálogo del Market."), F(14, "Ficha de una API vista sin haber entrado."),
        H3("Crear tu cuenta"),
        OL("Pulsa **Crear cuenta**: nombre, correo, contraseña de 12 caracteres o más y aceptación de los términos.", "Abre el enlace que te llega por correo para verificar la cuenta. Sin verificar no puedes probar, comprar ni solicitar acceso.", "Entra con tu correo y tu contraseña."),
        F(15, "Alta de cuenta."), F(16, "Entrada al Market."),
        H3("Probar gratis y comprar"),
        P("Con la sesión iniciada, cada plan de la ficha muestra sus botones:"),
        T(["Botón", "Qué pasa"],
          ["**Probar gratis**", "Recibes al momento una clave con la cuota de prueba (por ejemplo 50 peticiones durante 7 días). Una prueba por plan y hasta 3 al día"],
          ["**Comprar**", "Vas a la página de pago de Stripe. Al pagar, vuelves a una página que te entrega la clave una sola vez"],
          ["**Solicitar acceso**", "Para planes con aprobación: explicas para qué lo necesitas y el dueño decide. Si aprueba, pagas y recibes la clave"]),
        F(17, "Ficha con la sesión iniciada: botones Comprar y Probar gratis."), F(18, "Clave de prueba (oculta en el pantallazo)."),
        P("**Copia la clave en cuanto la veas**: no se vuelve a mostrar, porque LicenRoute solo guarda un resumen cifrado de ella. Si la pierdes, el dueño puede revocarla y tendrás que obtener otra."),
        H3("Tus compras, pruebas y solicitudes"),
        P("**Mis compras** muestra cada pago con su estado (pendiente, pagado, reembolsado…) y cada prueba con su uso. **Mis solicitudes** muestra las peticiones de acceso y la decisión del dueño. En **Mi cuenta** cambias tus datos, descargas tus datos o eliminas la cuenta."),
        F(19, "Mis compras y pruebas.")]],
      ["agents", "Para agentes de IA", [
        P("Los asistentes de IA pueden encontrar y recomendar APIs del Market por dos vías. Ninguna paga nada: el agente propone y una persona decide."),
        P("**1. El catálogo en JSON.** `GET /market/catalog.json` devuelve las fichas públicas con sus planes, precios, cuotas y pruebas, en el formato `licenroute.market.catalog/v1`. No incluye rutas internas, límites ni claves."),
        F(20, "catalog.json visto en el navegador."),
        P("**2. El servidor MCP.** `packages/market-mcp` no tiene dependencias y ofrece tres herramientas:"),
        T(["Herramienta", "Qué devuelve"], ["`search_apis`", "APIs que encajan con lo que pides (\"festivos españa\", \"validar NIF\"), con el precio más bajo"],
          ["`get_api`", "Todo sobre una API: descripción, ejemplo, uso real y planes"], ["`request_purchase`", "El enlace para que una persona active la prueba o compre"]),
        P("Para conectarlo en Claude Code:"),
        CODE("claude mcp add licenroute-market -e LICENROUTE_MARKET_URL=https://<tu-market>/market -- node <ruta>/packages/market-mcp/bin/licenroute-market-mcp.mjs"),
        P("En Cursor se añade lo mismo en `.cursor/mcp.json`; el README del paquete trae el ejemplo.")]],
      ["faq", "Preguntas frecuentes y límites actuales", [
        P("**¿Se cobra dinero real?** No. Hoy todo funciona en modo de pruebas de Stripe: puedes pagar con tarjetas de prueba y no se mueve dinero."),
        P("**¿Puedo usarlo ya con clientes de verdad?** Todavía no. El panel y el Market funcionan en local; el servidor público es el siguiente paso."),
        P("**¿Qué pasa si LicenRoute no responde?** Las rutas de pago de tu API devuelven 503 hasta que vuelve; las rutas públicas siguen funcionando."),
        P("**He perdido mi clave.** No se puede recuperar: solo se guarda un resumen cifrado. Pide al dueño que la revoque y consigue otra."),
        P("**¿Qué responde una ruta de pago?** Sin clave, 402 con el plan y el enlace de compra. Con clave válida, 200. Con una clave inventada o revocada, 403. Con la cuota agotada, 402."),
        P("**¿Qué tecnologías admite?** APIs en Node.js con Express 4 o 5. Para otros frameworks, escríbenos desde licenroute.com.")]]
    ]
  }
};

function block(b, imgBase) {
  if (b.p) return `  <p>${inl(b.p)}</p>`;
  if (b.h3) return `  <h3>${inl(b.h3)}</h3>`;
  if (b.ol) return `  <ol>\n${b.ol.map((i) => `    <li>${inl(i)}</li>`).join("\n")}\n  </ol>`;
  if (b.code) return `  <pre class="block">${esc(b.code)}</pre>`;
  if (b.table) return `  <div class="table-wrap"><table>\n    <thead><tr>${b.table.head.map((h) => `<th scope="col">${inl(h)}</th>`).join("")}</tr></thead>\n    <tbody>\n${b.table.rows.map((r) => `      <tr>${r.map((c) => `<td>${inl(c)}</td>`).join("")}</tr>`).join("\n")}\n    </tbody>\n  </table></div>`;
  if (b.fig) {
    const n = String(b.fig.n).padStart(2, "0");
    return `  <figure class="shot">\n    <img src="${imgBase}fig${n}.png" alt="${esc(b.fig.caption)}" width="1280" height="${DIMS[b.fig.n]}" loading="lazy" decoding="async">\n    <figcaption>${inl(b.fig.caption)}</figcaption>\n  </figure>`;
  }
  throw new Error("unknown block");
}

function page(c) {
  const depth = c.lang === "es" ? "../../" : "../";
  const imgBase = `${depth}manual/img/`;
  const canonical = `${SITE}${c.path}`;
  const toc = c.sections.map(([id, h]) => `    <li><a href="#${id}">${esc(h)}</a></li>`).join("\n");
  const body = c.sections.map(([id, h, blocks]) => `  <h2 id="${id}">${esc(h)}</h2>\n${blocks.map((b) => block(b, imgBase)).join("\n")}`).join("\n\n");
  const ld = JSON.stringify({ "@context": "https://schema.org", "@type": "TechArticle", headline: c.h1, description: c.description, inLanguage: c.lang,
    url: canonical, dateModified: UPDATED, image: `${SITE}/manual/img/fig17.png`, publisher: { "@type": "Organization", name: "LicenRoute", url: SITE } }).replace(/</g, "\\u003c");
  const home = c.lang === "es" ? "../" : "../";
  return `<!doctype html>
<html lang="${c.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.title)}</title>
<meta name="description" content="${esc(c.description)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="en" href="${SITE}/manual/">
<link rel="alternate" hreflang="es" href="${SITE}/es/manual/">
<link rel="alternate" hreflang="x-default" href="${SITE}/manual/">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#f2a516">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(c.h1)}">
<meta property="og:description" content="${esc(c.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:site_name" content="LicenRoute">
<meta property="og:locale" content="${c.lang === "es" ? "es_ES" : "en_US"}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${depth}styles.css?v=${CSS_V}">
<script type="application/ld+json">${ld}</script>
</head>
<body>
<a class="skip" href="#main">${esc(c.skip)}</a>
<header class="site">
  <div class="wrap">
    <a class="brand" href="${home}" aria-label="LicenRoute, ${esc(c.home)}"><img src="${depth}mark.svg" alt="" width="34" height="34">LicenRoute</a>
    <nav class="top" aria-label="${esc(c.nav)}">
      <a href="./" aria-current="page">${esc(c.manual)}</a>
      <a class="opt" href="${depth}guides/"${c.lang === "es" ? ' hreflang="en"' : ""}>${esc(c.guides)}</a>
      <a class="opt" href="https://github.com/licenroute/licenroute">GitHub</a>
      <a href="${c.lang === "es" ? "../../manual/" : "../es/manual/"}" hreflang="${c.otherLang}" lang="${c.otherLang}">${esc(c.otherLabel)}</a>
    </nav>
  </div>
</header>

<main id="main" class="prose manual">
  <h1>${esc(c.h1)}</h1>
  <p class="lead">${esc(c.lead)}</p>
  <p class="meta">${esc(c.updated)}: ${UPDATED}</p>
  <p class="note">${esc(c.note)}</p>
  <nav class="toc" aria-label="${esc(c.toc)}">
  <p class="meta">${esc(c.toc)}</p>
  <ol>
${toc}
  </ol>
  </nav>

${body}
</main>

<footer class="site">
  <div class="wrap">
    <div>
      <a class="brand" href="${home}"><img src="${depth}mark.svg" alt="" width="34" height="34">LicenRoute</a>
      <p class="legal">${esc(c.legal)}</p>
    </div>
    <nav aria-label="${esc(c.footer)}">
      <a href="${home}">${esc(c.home)}</a>
      <a href="${depth}guides/">${esc(c.guides)}</a>
      <a href="https://github.com/licenroute/licenroute">GitHub</a>
      <a href="${depth}llms.txt">llms.txt</a>
      <a href="${c.lang === "es" ? "../../manual/" : "../es/manual/"}" hreflang="${c.otherLang}" lang="${c.otherLang}">${esc(c.otherLabel)}</a>
    </nav>
  </div>
</footer>
</body>
</html>
`;
}

const root = new URL("..", import.meta.url).pathname;
for (const c of Object.values(C)) {
  // Same structure in both languages: same section ids and the same figures in the same order.
  const figs = (x) => x.sections.flatMap(([, , bs]) => bs.filter((b) => b.fig).map((b) => b.fig.n)).join();
  if (c.sections.map(([id]) => id).join() !== C.en.sections.map(([id]) => id).join() || figs(c) !== figs(C.en)) throw new Error(`${c.lang}: structure differs from en`);
  const dir = join(root, c.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page(c));
  console.log(`wrote ${c.path}index.html`);
}
