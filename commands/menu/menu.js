import fs from "fs";
import path from "path";

let menuImageCache = null;
let menuImageCacheKey = "";

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function formatUptime(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m`;
}

function getPrimaryPrefix(settings) {
  if (Array.isArray(settings?.prefix)) {
    return settings.prefix.find((value) => cleanText(value)) || ".";
  }
  return cleanText(settings?.prefix || ".") || ".";
}

function getPrefixLabel(settings) {
  if (Array.isArray(settings?.prefix)) {
    const values = settings.prefix.map((value) => cleanText(value)).filter(Boolean);
    return values.length ? values.join(" | ") : ".";
  }
  return cleanText(settings?.prefix || ".") || ".";
}

function getGithubLink(settings) {
  const fallback = "https://github.com/YO-OFC/yo-ofc-bot";
  const raw = cleanText(settings?.githubUrl || settings?.repoUrl || settings?.repository || fallback);
  return raw || fallback;
}

function normalizeCategoryKey(value = "") {
  const key = cleanText(value).toLowerCase();
  const aliases = {
    descarga: "descargas", download: "descargas", downloads: "descargas",
    busquedas: "busqueda", buscar: "busqueda", search: "busqueda",
    grupo: "grupos", group: "grupos", groups: "grupos",
    herramienta: "herramientas", tool: "herramientas", tools: "herramientas",
    game: "juegos", games: "juegos",
    economy: "economia", banco: "economia",
    ia: "ia", ai: "ia",
    system: "sistema",
    owner: "owner", dueño: "owner", dueno: "owner",
    admin: "admin",
  };
  return aliases[key] || key || "otros";
}

function normalizeCategoryLabel(value = "") {
  const key = normalizeCategoryKey(value);
  const labels = {
    menu: "ρяιη¢ιραℓ",
    descargas: "∂σωηℓσα∂єя",
    busqueda: "вυѕqυє∂α",
    juegos: "gαмє",
    herramientas: "нєяяαмιєηтαѕ",
    grupos: "gяυρσѕ",
    economia: "є¢σησму",
    sistema: "ѕιѕтємα",
    ia: "ια",
    media: "мє∂ια",
    anime: "αηιмє",
    admin: "α∂мιη",
    owner: "σωηєя",
    otros: "σтяσѕ",
  };
  return labels[key] || cleanText(value).replace(/_/g, " ").toUpperCase();
}

function getCategoryIcon(category = "") {
  const key = normalizeCategoryKey(category);
  const icons = {
    menu: "🕸️", descargas: "📥", busqueda: "🔎", juegos: "🎮",
    herramientas: "🛠️", grupos: "👥", economia: "💰", sistema: "⚙️",
    ia: "🧠", media: "🖼️", anime: "🌸", admin: "👑", owner: "🔧", otros: "📁",
  };
  return icons[key] || "✨";
}

function getCategorySortIndex(category = "") {
  const order = ["menu", "descargas", "busqueda", "juegos", "herramientas",
    "grupos", "economia", "sistema", "ia", "media", "anime", "admin", "owner", "otros"];
  const index = order.indexOf(normalizeCategoryKey(category));
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function getMenuImageBuffer() {
  return 'https://files.catbox.moe/z2ij0x.jpeg';
}

function getCommandNames(cmd) {
  const commandRaw = cmd?.command || cmd?.commands || cmd?.cmd;
  if (Array.isArray(commandRaw)) {
    return commandRaw.map((value) => cleanText(value).toLowerCase()).filter(Boolean);
  }
  const single = cleanText(commandRaw).toLowerCase();
  return single ? [single] : [];
}

function getMainCommand(cmd) {
  const names = getCommandNames(cmd);
  return names[0] || "";
}

function getCommandAliases(cmd) {
  const names = getCommandNames(cmd);
  return names.length > 1 ? names.slice(1) : [];
}

function getCommandCategory(cmd) {
  return normalizeCategoryKey(cmd?.categoria || cmd?.category || "otros");
}

function isHiddenCommand(cmd) {
  return Boolean(cmd?.hidden || cmd?.hide || cmd?.oculto);
}

function getCommandDescription(cmd) {
  return cleanText(cmd?.description || cmd?.desc || cmd?.help || "");
}

function getCommandAccessLabel(cmd) {
  if (cmd?.ownerOnly) return "👑 OWNER";
  if (cmd?.adminOnly) return "🛡️ ADMIN";
  return "📢 PUBLICO";
}

function getPluginKey(cmd, fallback = "") {
  return cleanText(cmd?.__pluginKey) || cleanText(cmd?.__sourceFile) || cleanText(cmd?.name) || cleanText(fallback);
}

function collectCommandData(comandos) {
  const categories = {};
  const seenPlugins = new Set();
  for (const cmd of new Set(comandos.values())) {
    if (!cmd || isHiddenCommand(cmd)) continue;
    const main = getMainCommand(cmd);
    if (!main) continue;
    const pluginKey = getPluginKey(cmd, main).toLowerCase();
    if (!pluginKey || seenPlugins.has(pluginKey)) continue;
    seenPlugins.add(pluginKey);
    const category = getCommandCategory(cmd);
    if (!categories[category]) categories[category] = new Map();
    categories[category].set(main, {
      name: main,
      description: getCommandDescription(cmd),
      pluginKey,
      aliases: getCommandAliases(cmd),
      access: getCommandAccessLabel(cmd),
    });
  }
  const cleanCategories = {};
  for (const [category, map] of Object.entries(categories)) {
    cleanCategories[category] = Array.from(map.values()).sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || "")));
  }
  return cleanCategories;
}

function getCategoryDescription(category = "", count = 0) {
  const key = normalizeCategoryKey(category);
  const descriptions = {
    menu: "Panel principal del bot",
    descargas: "Audio, video y descargas",
    busqueda: "Búsqueda y resultados rápidos",
    juegos: "Diversión y minijuegos",
    herramientas: "Herramientas y utilidades",
    grupos: "Ajustes y control de grupos",
    economia: "Sistema económico del bot",
    sistema: "Estado, update y control",
    ia: "Funciones de inteligencia artificial",
    media: "Imagen, stickers y multimedia",
    anime: "Comandos de anime",
    admin: "Comandos administrativos",
    owner: "Funciones exclusivas owner",
    otros: "Otros comandos disponibles",
  };
  const base = descriptions[key] || "Categoría del bot";
  return `${base} · ${count} comandos`;
}

function chunkRows(rows, size = 10) {
  const list = Array.isArray(rows) ? rows : [];
  const chunkSize = Math.max(1, Number(size || 10));
  const chunks = [];
  for (let index = 0; index < list.length; index += chunkSize) {
    chunks.push(list.slice(index, index + chunkSize));
  }
  return chunks;
}

function buildDensityBar(current = 0, total = 0, size = 6) {
  const safeTotal = Math.max(1, Number(total || 0));
  const ratio = Math.max(0, Math.min(1, Number(current || 0) / safeTotal));
  const filled = Math.max(1, Math.round(ratio * size));
  return `${"⬛".repeat(filled)}${"⬜".repeat(Math.max(0, size - filled))}`;
}

function getCategoryHighlight(commands = [], primaryPrefix = ".") {
  const items = Array.isArray(commands) ? commands : [];
  const accessCounts = {
    "📢 PUBLICO": items.filter((item) => item.access === "📢 PUBLICO").length,
    "🛡️ ADMIN": items.filter((item) => item.access === "🛡️ ADMIN").length,
    "👑 OWNER": items.filter((item) => item.access === "👑 OWNER").length,
  };
  const mainAccess = Object.entries(accessCounts)
    .sort((a, b) => b[1] - a[1])
    .find(([, count]) => count > 0)?.[0] || "📢 PUBLICO";
  return {
    accessCounts,
    mainAccess,
    quick: items.slice(0, 3).map((item) => `${primaryPrefix}${item.name}`),
  };
}

function buildTopPanel({ settings, uptime, totalCategories, totalCommands, prefixLabel, menuTitle, menuSubtitle, botLine }) {
  return `
ㅤ    ꒰ 🕸️ *${menuTitle}* ⫏⫏ ꒱
ㅤ    ⿻ ✿ ιηƒσ 木 αтт 性

> ₊· нσℓα *${botLine || settings?.botName || "YO OFC"}*

𑁍𓂃 𓈒𓏸 *DEVELOPER ::* EL VIGILANTE
𑁍𓂃 𓈒𓏸 *TIPO ::* Owner
𑁍𓂃 𓈒𓏸 *SISTEMA/OPR ::* android
𑁍𓂃 𓈒𓏸 *TIME ::* ${new Date().toLocaleString()}
𑁍𓂃 𓈒𓏸 *USERS ::* ${totalCommands}
𑁍𓂃 𓈒𓏸 *CMDS EJEC ::* ${totalCategories}
𑁍𓂃 𓈒𓏸 *MI TIEMPO ::* ${uptime}`;
}

function buildCategoryIndex(categoryNames, categories) {
  const totalCommands = categoryNames.reduce((sum, category) => sum + (categories[category]?.length || 0), 0);
  const list = categoryNames.map((category, index) => {
    const icon = getCategoryIcon(category);
    const label = normalizeCategoryLabel(category);
    const count = categories[category]?.length || 0;
    const density = buildDensityBar(count, totalCommands, 5);
    const slot = String(index + 1).padStart(2, "0");
    return `${slot}) ${icon} ${label}  [${count}] ${density}`;
  }).join("\n");
  return `
ㅤ    ꒰ ✿ *CATEGORÍAS* ⫏⫏ ꒱
ㅤ    ⿻ ㅤ ✿ ㅤ ℓιѕтα 木 🗂️ ㅤ 性

> ₊· ${list}`;
}

function buildCategoryBlock(category, commands, primaryPrefix) {
  const icon = getCategoryIcon(category);
  const title = normalizeCategoryLabel(category);
  const highlight = getCategoryHighlight(commands, primaryPrefix);
  const maxPreview = 8;
  
  let output = `
ㅤ    ꒰ ${icon} *${title}* ⫏⫏ ꒱
ㅤ    ⿻ ㅤ ✿ ㅤ ¢σмαη∂σѕ 木 📜 ㅤ 性

> ₊· ${getCategoryDescription(category, commands.length)}
> ₊· Acceso: ${highlight.accessCounts["📢 PUBLICO"] || 0} 📢 / ${highlight.accessCounts["🛡️ ADMIN"] || 0} 🛡️ / ${highlight.accessCounts["👑 OWNER"] || 0} 👑`;

  const commandLines = commands.slice(0, maxPreview).map((item, index) => {
    const slot = String(index + 1).padStart(2, "0");
    return `> ₊· ${slot}. ${primaryPrefix}${item.name} ${item.access}`;
  });
  output += "\n" + commandLines.join("\n");

  if (commands.length > maxPreview) {
    output += `\n> ₊· … y ${commands.length - maxPreview} comandos más`;
  }
  if (highlight.quick.length) {
    output += `\n\n> ₊· ⚡ Inicio rápido: ${highlight.quick.join(" • ")}`;
  }
  output += `\n\nㅤ    ꒰ ✿ *YO OFC* ⫏⫏ ꒱`;
  return output;
}

function buildFooter(primaryPrefix, settings = {}) {
  return `
ㅤ    ꒰ ✿ *ACCESO RÁPIDO* ⫏⫏ ꒱
ㅤ    ⿻ ㅤ ✿ ㅤ ¢σмαη∂σѕ 木 🚀 ㅤ 性

> ₊· ${primaryPrefix}menu
> ₊· ${primaryPrefix}menu descargas
> ₊· ${primaryPrefix}menu grupos
> ₊· ${primaryPrefix}status
> ₊· ${primaryPrefix}owner

ㅤ    ꒰ ✿ *YO OFC* ⫏⫏ ꒱
ㅤ    ⿻ 性 ѕιѕтємα єנє¢υтα∂α ✿

> *YO OFC desarrollado por EL VIGILANTE* ૮(˶ᵔᵕᵔ˶)ა`;
}

function makeSingleCaption(fullCaption, primaryPrefix) {
  const maxLength = 3900;
  if (fullCaption.length <= maxLength) return fullCaption;
  return `${fullCaption.slice(0, 3800)}\n\nㅤ    ꒰ ⚠️ *MENÚ RECORTADO* ⫏⫏ ꒱\nㅤ    ⿻ ㅤ ✿ ㅤ ℓιмιтє 木 📏 ㅤ 性\n\n> ₊· Usa ${primaryPrefix}menu para ver más categorías\n\nㅤ    ꒰ ✿ *YO OFC* ⫏⫏ ꒱`;
}

async function react(sock, msg, emoji) {
  try {
    if (!msg?.key) return;
    await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
  } catch {}
}

function buildCategoryRows(categoryNames, categories, primaryPrefix) {
  return categoryNames.map((category) => {
    const icon = getCategoryIcon(category);
    const label = normalizeCategoryLabel(category);
    const items = categories[category] || [];
    const count = items.length;
    const highlight = getCategoryHighlight(items, primaryPrefix);
    const preview = items.slice(0, 3).map((item) => `${primaryPrefix}${item.name}`).join(" • ");
    return {
      header: icon,
      title: label,
      description: `${count} cmds · ${highlight.mainAccess}${preview ? ` · ${preview}` : ""}`.slice(0, 72),
      id: `${primaryPrefix}menu ${category}`,
    };
  });
}

function buildCategorySections(categoryNames, categories, primaryPrefix) {
  const rowByCategory = new Map(buildCategoryRows(categoryNames, categories, primaryPrefix).map((row) => [
    normalizeCategoryKey(row?.id?.replace(`${primaryPrefix}menu`, "").trim()), row
  ]));
  const pick = (key) => rowByCategory.get(normalizeCategoryKey(key));
  const sections = [];
  const mainRows = [pick("menu"), pick("descargas"), pick("grupos")].filter(Boolean);
  if (mainRows.length) sections.push({ title: "⚡ MENÚ PRINCIPAL", highlight_label: "POPULAR", rows: mainRows });
  const gameRows = [pick("juegos"), pick("economia")].filter(Boolean);
  if (gameRows.length) sections.push({ title: "🎮 ENTRETENIMIENTO", highlight_label: "FUN", rows: gameRows });
  const toolRows = [pick("ia"), pick("herramientas"), pick("media"), pick("anime")].filter(Boolean);
  if (toolRows.length) sections.push({ title: "🤖 IA Y TOOLS", highlight_label: "SMART", rows: toolRows });
  const adminRows = [pick("sistema"), pick("admin"), pick("owner")].filter(Boolean);
  if (adminRows.length) sections.push({ title: "🛡️ ADMINISTRACIÓN", highlight_label: "CONTROL", rows: adminRows });
  if (!sections.length) {
    return [{ title: "Categorías del bot", rows: buildCategoryRows(categoryNames, categories, primaryPrefix) }];
  }
  return sections;
}

function buildMenuButtons(primaryPrefix, categoryNames, categories) {
  const sections = buildCategorySections(categoryNames, categories, primaryPrefix);
  const flowButton = {
    buttonId: "menu_action_select",
    buttonText: { displayText: "☷ ABRIR MENÚ" },
    type: 4,
    nativeFlowInfo: {
      name: "single_select",
      paramsJson: JSON.stringify({
        title: "🔥 YO OFC - SELECTOR DE COMANDOS",
        sections,
      }),
    },
  };
  const quickButtons = [
    { buttonId: `${primaryPrefix}owner`, buttonText: { displayText: "👑 CREADOR" }, type: 1 },
    { buttonId: `${primaryPrefix}status`, buttonText: { displayText: "📊 ESTADO" }, type: 1 },
  ];
  return [flowButton, ...quickButtons];
}

function buildMenuLandingText(menuContext, settings, uptime, totalCategories, totalCommands, prefixLabel) {
  return `
ㅤ    ꒰ 🕸️ *YO OFC* ⫏⫏ ꒱
ㅤ    ⿻ ㅤ ✿ ㅤ мєηυ 木 📋 ㅤ 性

> ₊· нσℓα *${menuContext.botLine || settings?.botName || "YO OFC"}*
> ₊· Pulsa ABRIR MENÚ para desplegar categorías.

𑁍𓂃 𓈒𓏸 *Vista:* ${menuContext.subtitle}
𑁍𓂃 𓈒𓏸 *Prefijos:* ${prefixLabel}
𑁍𓂃 𓈒𓏸 *Bot:* ${menuContext.title}
𑁍𓂃 𓈒𓏸 *Owner:* ${settings?.ownerName || "EL VIGILANTE"}
𑁍𓂃 𓈒𓏸 *Tiempo activo:* ${uptime}
𑁍𓂃 𓈒𓏸 *Categorías:* ${totalCategories}
𑁍𓂃 𓈒𓏸 *Comandos:* ${totalCommands}

ㅤ    ꒰ ✿ *YO OFC* ⫏⫏ ꒱
ㅤ    ⿻ 性 ѕιѕтємα єנє¢υтα∂α ✿

> *YO OFC desarrollado por EL VIGILANTE* ૮(˶ᵔᵕᵔ˶)ა`;
}

function buildCategoryMenuText(category, commands, primaryPrefix, settings = {}) {
  const icon = getCategoryIcon(category);
  const label = normalizeCategoryLabel(category);
  const count = commands.length;
  const highlight = getCategoryHighlight(commands, primaryPrefix);
  const commandBlocks = chunkRows(commands, 8).map((chunk, index) => {
    const pageLabel = commands.length > 8 ? `Página ${index + 1}/${Math.ceil(commands.length / 8)}` : "Página 1/1";
    const lines = [
      `ㅤ    ꒰ ${icon} *${label}* • ${pageLabel} ⫏⫏ ꒱`,
      `ㅤ    ⿻ ㅤ ✿ ㅤ ¢σмαη∂σѕ 木 📜 ㅤ 性`,
      ``,
    ];
    for (const [itemIndex, item] of chunk.entries()) {
      const aliasText = item.aliases?.length ? `Alias: ${item.aliases.slice(0, 3).join(", ")}` : "";
      const slot = String(index * 8 + itemIndex + 1).padStart(2, "0");
      lines.push(`> ₊· ${slot}. ${primaryPrefix}${item.name} ${item.access}`);
      lines.push(`> ₊· ${item.description || "Comando disponible del bot."}`);
      if (aliasText) lines.push(`> ₊· ${aliasText}`);
      lines.push(``);
    }
    lines.push(`ㅤ    ꒰ ✿ *YO OFC* ⫏⫏ ꒱`);
    return lines.join("\n");
  });
  return `
ㅤ    ꒰ ${icon} *${label}* ⫏⫏ ꒱
ㅤ    ⿻ ㅤ ✿ ㅤ ιηƒσ 木 ℓιѕтα ㅤ 性

> ₊· ${getCategoryDescription(category, count)}
> ₊· 📌 Comandos: ${count}
> ₊· 🔓 Público: ${highlight.accessCounts["📢 PUBLICO"] || 0}
> ₊· 🛡️ Admin: ${highlight.accessCounts["🛡️ ADMIN"] || 0}
> ₊· 👑 Owner: ${highlight.accessCounts["👑 OWNER"] || 0}
${highlight.quick.length ? `> ₊· ⚡ Inicio rápido: ${highlight.quick.join(" • ")}` : "> ₊· ⚡ Categoría lista para usar"}
> ₊· Usa el prefijo + comando para ejecutar.

ㅤ    ꒰ ✿ *YO OFC* ⫏⫏ ꒱

${commandBlocks.join("\n\n")}

${buildFooter(primaryPrefix, settings)}`;
}

async function sendInteractiveMenu(sock, from, quoted, payload, fallbackText) {
  try {
    return await sock.sendMessage(from, { ...payload, ...global.channelInfo }, quoted);
  } catch {
    return await sock.sendMessage(from, { text: fallbackText, ...global.channelInfo }, quoted);
  }
}

export default {
  command: ["menu", "help", "comandos", "menucat"],
  categoria: "menu",
  description: "Muestra el menú principal del bot.",

  run: async ({ sock, msg, from, settings, comandos, botId, botLabel, args = [] }) => {
    try {
      await react(sock, msg, "📜");

      if (!comandos) {
        await react(sock, msg, "❌");
        return await sock.sendMessage(from, {
          text: `ㅤ    ꒰ ❌ *ERROR MENÚ* ⫏⫏ ꒱\nㅤ    ⿻ ㅤ ✿ ㅤ єяяσя 木 ⚠️ ㅤ 性\n\n> ₊· No se encontró la lista de comandos.\n\nㅤ    ꒰ ✿ *YO OFC* ⫏⫏ ꒱`,
          ...global.channelInfo,
        }, { quoted: msg });
      }

      const imageBuffer = getMenuImageBuffer();
      const uptime = formatUptime(process.uptime());
      const primaryPrefix = getPrimaryPrefix(settings);
      const prefixLabel = getPrefixLabel(settings);
      const menuContext = {
        title: "YO OFC",
        subtitle: "MENÚ PRINCIPAL",
        botLine: settings?.botName || "YO OFC",
      };
      const categories = collectCommandData(comandos);
      const requestedCategory = normalizeCategoryKey(args.join(" "));

      const categoryNames = Object.keys(categories).sort((a, b) => {
        const byOrder = getCategorySortIndex(a) - getCategorySortIndex(b);
        if (byOrder !== 0) return byOrder;
        return String(a).localeCompare(String(b));
      });

      const totalCommands = categoryNames.reduce((sum, category) => sum + categories[category].length, 0);

      if (requestedCategory && requestedCategory !== "menu" && categories[requestedCategory]) {
        const commandList = categories[requestedCategory];
        const categoryText = buildCategoryMenuText(requestedCategory, commandList, primaryPrefix, settings);
        await sock.sendMessage(from, { text: makeSingleCaption(categoryText, primaryPrefix), ...global.channelInfo }, { quoted: msg });
        await react(sock, msg, "✅");
        return;
      }

      const topPanel = buildTopPanel({
        settings, uptime, totalCategories: categoryNames.length, totalCommands,
        prefixLabel, menuTitle: menuContext.title, menuSubtitle: menuContext.subtitle, botLine: menuContext.botLine,
      });

      const textParts = [
        topPanel,
        buildCategoryIndex(categoryNames, categories),
        ...categoryNames.map((category) => buildCategoryBlock(category, categories[category], primaryPrefix)),
        buildFooter(primaryPrefix, settings),
      ];

      const fullCaption = textParts.join("\n\n").trim();
      const finalCaption = makeSingleCaption(fullCaption, primaryPrefix);
      const landingText = buildMenuLandingText(menuContext, settings, uptime, categoryNames.length, totalCommands, prefixLabel);

      const buttons = buildMenuButtons(primaryPrefix, categoryNames, categories);

      try {
        const payload = {
          footer: `© ${settings?.ownerName || "EL VIGILANTE"}`,
          buttons,
          headerType: 1,
          ...global.channelInfo,
        };

        if (imageBuffer) {
          payload.image = { url: imageBuffer };
          payload.caption = landingText;
          payload.headerType = 4;
        } else {
          payload.text = landingText;
        }

        await sock.sendMessage(from, payload, { quoted: msg });
      } catch {
        await sendInteractiveMenu(sock, from, { quoted: msg }, {
          text: landingText,
          title: menuContext.title,
          subtitle: menuContext.subtitle,
          footer: `© ${settings?.ownerName || "EL VIGILANTE"}`,
          interactiveButtons: [{
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "🔥 YO OFC - SELECTOR DE COMANDOS",
              sections: buildCategorySections(categoryNames, categories, primaryPrefix),
            }),
          }],
        }, finalCaption);
      }

      await react(sock, msg, "✅");
    } catch (error) {
      console.error("MENU ERROR:", error);
      await react(sock, msg, "❌");
      await sock.sendMessage(from, {
        text: `ㅤ    ꒰ ❌ *ERROR MENÚ* ⫏⫏ ꒱\nㅤ    ⿻ ㅤ ✿ ㅤ єяяσя 木 ⚠️ ㅤ 性\n\n> ₊· ${String(error?.message || "Error desconocido")}\n\nㅤ    ꒰ ✿ *YO OFC* ⫏⫏ ꒱`,
        ...global.channelInfo,
      }, { quoted: msg });
    }
  },
};