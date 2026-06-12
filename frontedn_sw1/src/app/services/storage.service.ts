import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private http = inject(HttpClient);
  private coreUrl = environment.coreUrl;

  getDownloadUrl(clientId: string, fileName: string): Observable<{ url: string }> {
    return this.http.get<{url: string}>(`${this.coreUrl}/storage/download-url/${clientId}?fileName=${fileName}`);
  }

  getUploadUrl(clientId: string, fileName: string, contentType: string): Observable<{ url: string }> {
    return this.http.get<{url: string}>(`${this.coreUrl}/storage/upload-url/${clientId}?fileName=${fileName}&contentType=${contentType}`);
  }

  uploadFileDirectly(uploadUrl: string, file: File): Observable<any> {
    // Petición directa a S3 usando la URL firmada
    return this.http.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type
      }
    });
  }
}
