// Tipos para que el editor (VS Code) reconozca window.fbq y los ayudantes del
// pixel sin marcar error en rojo. Este proyecto NO usa TypeScript ni build:
// el archivo existe solo para autocompletado y avisos dentro del editor.

export {};

declare global {
  /** Función del Meta Pixel (la crea pixel.js / fbevents.js). */
  interface FbqFn {
    (metodo: 'init', pixelId: string, datos?: Record<string, unknown>): void;
    (metodo: 'track', evento: string, datos?: Record<string, unknown>): void;
    (metodo: 'trackCustom', evento: string, datos?: Record<string, unknown>): void;
    (metodo: string, ...args: unknown[]): void;
    queue?: unknown[];
    loaded?: boolean;
    version?: string;
    callMethod?: (...args: unknown[]) => void;
  }

  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;

    /** Ayudantes de GymGenio definidos en /pixel.js */
    ggPixel?: {
      track: (evento: string, datos?: Record<string, unknown>) => void;
      /** CompleteRegistration — se manda una sola vez por navegador. */
      registro: () => void;
      /** Purchase — se manda una sola vez por sesión de pago de Stripe. */
      compra: (idPago?: string) => void;
    };

    /** Precio de Pro en USD (fuente única, definida en /pixel.js). */
    GG_PRO_PRECIO_USD?: number;
    GG_PRO_MONEDA?: string;

    /** Bandera interna para no mandar PageView dos veces. */
    __ggPageViewEnviado?: boolean;
  }
}
