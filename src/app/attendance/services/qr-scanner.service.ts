import { Injectable, signal } from '@angular/core';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';

export class QrScannerError extends Error {
  constructor(
    readonly reason: 'NO_CAMERA' | 'PERMISSION' | 'FAILED',
    message: string,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class QrScannerService {
  readonly active = signal(false);
  private scanner: Html5Qrcode | null = null;

  async start(elementId: string, onCode: (code: string) => void): Promise<void> {
    await this.stop();
    const config: Html5QrcodeCameraScanConfig = {
      fps: 10,
      qrbox: { width: 230, height: 230 },
      aspectRatio: 1,
    };
    const cameras: MediaTrackConstraints[] = [
      { facingMode: 'environment' },
      { facingMode: 'user' },
    ];
    let lastError: unknown;

    for (const camera of cameras) {
      const scanner = new Html5Qrcode(elementId, { verbose: false });
      try {
        await scanner.start(
          camera,
          config,
          (text) => onCode(text.trim()),
          () => undefined,
        );
        this.scanner = scanner;
        this.active.set(true);
        return;
      } catch (error) {
        lastError = error;
        try {
          scanner.clear();
        } catch {
          // El intento fallido puede no haber creado vista.
        }
      }
    }

    this.active.set(false);
    throw this.mapError(lastError);
  }

  async stop(): Promise<void> {
    const scanner = this.scanner;
    this.scanner = null;
    this.active.set(false);
    if (!scanner) {
      return;
    }
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // La cámara ya estaba detenida.
    }
  }

  private mapError(error: unknown): QrScannerError {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return new QrScannerError('PERMISSION', 'El navegador bloqueó el acceso a la cámara.');
    }
    if (name === 'NotFoundError' || name === 'NotReadableError' || name === 'OverconstrainedError') {
      return new QrScannerError('NO_CAMERA', 'No hay una cámara disponible en este dispositivo.');
    }
    return new QrScannerError('FAILED', 'No fue posible activar la cámara.');
  }
}
