import { useState } from 'react';
import { ChevronDown, Menu, Shield, Smartphone, Calendar, Camera, Truck, Zap } from 'lucide-react';

type Section = {
  id: string;
  title: string;
  icon: typeof Shield;
  items: string[];
};

const SECTIONS: Section[] = [
  {
    id: 'infra',
    title: '1. Infraestructura y Aislamiento Técnico',
    icon: Smartphone,
    items: [
      'Usa conexión **4G/5G exclusiva** para cada cuenta de Vinted. Nunca WiFi de casa ni compartida con otra cuenta.',
      'Cada cuenta necesita un **dispositivo separado** (o perfil de trabajo aislado). No compartas el mismo navegador/app entre cuentas.',
      '**Aislamiento Financiero KYC**: Cada cuenta debe tener datos de identidad, bancarios y dirección únicos. Nunca cruces datos entre cuentas.',
      'Elimina los **metadatos EXIF** de todas las fotos antes de subirlas. No reutilices la misma foto en varias cuentas. Usa apps como "Photo Metadata Remover".',
    ],
  },
  {
    id: 'warmup',
    title: '2. Plan de Calentamiento (11 Días)',
    icon: Calendar,
    items: [
      '**D1-D3**: Solo interacción. Da likes, sigue perfiles, guarda favoritos. Mínimo 15-20 interacciones diarias. NO publiques nada.',
      '**D3-D4**: Truco Trust Score. Sube 2-3 artículos de ropa vieja a 1€. Si se venden, perfecto. Si no, borra en 48h. Esto activa el "Trust Score" interno.',
      '**D4-D7**: Sube "paja" (artículos baratos reales: camisetas, accesorios 3-10€). Máximo 3-4 anuncios/día. Varía horarios de publicación.',
      '**D8**: Lanza el primer par "cebo" a precio competitivo (margen mínimo). Observa si Vinted lo posiciona bien en búsquedas.',
      '**D9**: Sigue interactuando. Responde mensajes rápido. Vinted premia el tiempo de respuesta en su algoritmo.',
      '**D10-D11**: Empieza a subir stock real. Máximo 2-3 pares/día la primera semana. Después puedes escalar a 4-5/día.',
    ],
  },
  {
    id: 'listing',
    title: '3. Anatomía del Anuncio Perfecto',
    icon: Camera,
    items: [
      '**Formato 1:1** (cuadrado) obligatorio. Fondo con ruido visual o estilo de vida (alfombra, parqué, exterior). NUNCA repitas el mismo fondo.',
      'Los **6 ángulos obligatorios**: Lateral exterior, lateral interior, suela, talón, vista superior, etiqueta/caja.',
      '**Redacción NLP antibot**: No uses "nuevo", "original", "100% auténtico", "réplica", "retail" ni marcas en MAYÚSCULAS. Escribe de forma natural.',
      '**Título**: Usa variaciones naturales. En vez de "Nike Air Jordan 4 Black Cat" prueba "AJ4 en negro, talla 42, sin estrenar".',
      'No copies y pegues descripciones entre anuncios. Vinted detecta **patrones de texto repetitivo** entre cuentas.',
    ],
  },
  {
    id: 'logistics',
    title: '4. Logística y Escalabilidad',
    icon: Truck,
    items: [
      '**Rota puntos de envío**: Alterna entre InPost, Correos y UPS. No envíes siempre desde el mismo punto.',
      '**Stock único por cuenta**: Nunca listes el mismo par en dos cuentas a la vez. Si lo mueves, borra el anuncio primero.',
      '**Empaquetado**: Usa cajas diferentes entre envíos. No pongas siempre la misma cinta o relleno identificable.',
      'Si un comprador pregunta sobre volumen ("¿tienes más tallas?", "¿eres tienda?"), **responde como particular**.',
    ],
  },
  {
    id: 'pro',
    title: '5. Secretos Pro y Puntos Débiles IA',
    icon: Zap,
    items: [
      '**Device Age**: Vinted valora la antigüedad del dispositivo. Una cuenta nueva en un móvil recién reseteado levanta alertas. Usa dispositivos con historial.',
      '**Estilometría cruzada**: La IA compara estilos de escritura entre cuentas. Cada cuenta debe tener un "tono" diferente (formal vs. coloquial, con emojis vs. sin).',
      '**Evasión de SKU**: No pongas el código de referencia ni SKU en fotos o descripción. La IA cruza SKU para detectar vendedores duplicados.',
      '**Horarios humanos**: Publica entre 9:00-22:00 con pausas naturales. Nunca subas 10 artículos seguidos a las 3AM.',
      'Si recibes advertencia de Vinted, **PARA toda actividad comercial 48-72h**. Sigue con likes/favoritos. Después vuelve gradualmente.',
    ],
  },
];

function renderBold(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="ab-highlight">{part}</strong> : <span key={i}>{part}</span>
  );
}

export function AntiBanGuidePage({ openMenu }: { openMenu: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(SECTIONS[0].id);
  const toggle = (id: string) => setExpanded((cur) => cur === id ? null : id);

  return (
    <main className="page-shell antiban-page">
      <header className="sales-header">
        <button className="icon-button" onClick={openMenu} aria-label="Abrir menú"><Menu size={26} /></button>
        <h1>Guía Anti-Baneo</h1>
        <div className="header-spacer" />
      </header>

      <div className="ab-intro">
        <Shield size={22} className="ab-intro-icon" />
        <p>Biblioteca de referencia con las mejores prácticas para operar en Vinted sin riesgo de suspensión. Toca cada sección para expandirla.</p>
      </div>

      <section className="antiban-sections">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isOpen = expanded === sec.id;
          return (
            <div className={`antiban-section${isOpen ? ' open' : ''}`} key={sec.id}>
              <button className="antiban-section-header" onClick={() => toggle(sec.id)}>
                <div className="antiban-section-left">
                  <div className="antiban-section-icon"><Icon size={18} /></div>
                  <strong>{sec.title}</strong>
                </div>
                <ChevronDown size={18} className={`antiban-chevron${isOpen ? ' rotate' : ''}`} />
              </button>
              {isOpen && (
                <div className="antiban-section-body">
                  {sec.items.map((item, i) => (
                    <div className="ab-tip" key={i}>
                      <span className="ab-bullet" />
                      <p>{renderBold(item)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
