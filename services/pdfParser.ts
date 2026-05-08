
declare const pdfjsLib: {
  getDocument: (options: { data: ArrayBuffer }) => {
    promise: Promise<{
      numPages: number;
      destroy: () => Promise<void>;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{ items: { str: string }[] }>;
        getViewport: (options: { scale: number }) => { width: number; height: number };
        render: (options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
      }>;
    }>;
  };
};

export const extractTextFromPdf = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: La extracción de texto del archivo ${file.name} tardó demasiado.`));
    }, 180000); // 180 seconds timeout for text extraction

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (!event.target?.result) {
        clearTimeout(timeoutId);
        return reject(new Error("Error reading file."));
      }
      try {
        const pdf = await pdfjsLib.getDocument({ data: event.target.result }).promise;
        let content = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          content += `--- Página ${i} ---\n`;
          content += textContent.items.map((item: { str: string }) => item.str).join(' ');
          content += '\n\n';
          
          if (i % 20 === 0) {
            await new Promise(r => setTimeout(r, 0));
          }
        }
        
        try {
            await pdf.destroy();
        } catch (e) {
            console.warn("Error destroying PDF document:", e);
        }
        
        clearTimeout(timeoutId);
        resolve(content);
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error parsing PDF:', error);
        reject(new Error(`Failed to parse PDF file: ${message}`));
      }
    };
    reader.onerror = (error) => {
      clearTimeout(timeoutId);
      reject(error);
    };
    reader.readAsArrayBuffer(file);
  });
};

export const parsePdfToImageParts = async (file: File, maxPages: number = 100): Promise<{inlineData: {data: string, mimeType: string}}[]> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: El archivo ${file.name} tardó demasiado en procesarse.`));
    }, 300000); // 300 seconds timeout per file

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (!event.target?.result) {
        clearTimeout(timeoutId);
        return reject(new Error("Error reading file."));
      }
      try {
        const pdf = await pdfjsLib.getDocument({ data: event.target.result }).promise;
        const imageParts = [];
        const numPages = pdf.numPages;
        
        // Determine which pages to render as images
        const pagesToRender: number[] = [];
        if (numPages <= maxPages) {
          for (let i = 1; i <= numPages; i++) pagesToRender.push(i);
        } else {
          // Robust sampling strategy for long documents:
          // 1. First 50% of the quota from the beginning (Index, General Data, Parameters)
          const firstPartCount = Math.floor(maxPages * 0.5);
          for (let i = 1; i <= firstPartCount; i++) pagesToRender.push(i);

          // 2. 25% from the middle (Core calculations, tables)
          const middlePartCount = Math.floor(maxPages * 0.25);
          const middleStart = Math.floor(numPages / 2) - Math.floor(middlePartCount / 2);
          for (let i = 0; i < middlePartCount; i++) {
            const page = middleStart + i;
            if (page > firstPartCount && page < numPages - (maxPages - firstPartCount - middlePartCount)) {
              if (!pagesToRender.includes(page)) pagesToRender.push(page);
            }
          }

          // 3. Last 25% from the end (Conclusions, Signatures, Annexes)
          const lastPartCount = maxPages - pagesToRender.length;
          for (let i = numPages - lastPartCount + 1; i <= numPages; i++) {
            if (!pagesToRender.includes(i) && i > 0) {
              pagesToRender.push(i);
            }
          }
          
          // Final safety check: if we still have space, fill it
          let nextFill = 1;
          while (pagesToRender.length < maxPages && nextFill <= numPages) {
            if (!pagesToRender.includes(nextFill)) pagesToRender.push(nextFill);
            nextFill++;
          }

          pagesToRender.sort((a, b) => a - b);
        }

        for (const pageNum of pagesToRender) {
          const page = await pdf.getPage(pageNum);
          
          // Dynamic scaling: High detail for technical documents and blueprints
          // Increase scale to 2.0 for better OCR legibility, especially for small numbers in calculation memories
          const scale = numPages > 30 ? 1.5 : 2.0;
          const viewport = page.getViewport({ scale });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) {
            clearTimeout(timeoutId);
            return reject(new Error('Could not get canvas context'));
          }
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport: viewport }).promise;
          
          // Quality 0.75 is a good balance between file size and OCR legibility
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          const base64Data = dataUrl.split(',')[1];

          imageParts.push({
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg'
            }
          });

          // Clean up canvas to free memory
          canvas.width = 0;
          canvas.height = 0;
          canvas.remove(); // Remove from DOM if it was somehow attached
          
          // Small delay to prevent blocking the main thread
          if (pageNum % 2 === 0) { // More frequent yields for large blueprints
            await new Promise(r => setTimeout(r, 20));
          }
        }
        
        // Cleanup PDF document to free memory
        try {
            await pdf.destroy();
        } catch (e) {
            console.warn("Error destroying PDF document:", e);
        }
        
        clearTimeout(timeoutId);
        resolve(imageParts);
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error parsing PDF to images:', error);
        reject(new Error(`Failed to parse PDF file into images: ${message}`));
      }
    };
    reader.onerror = (error) => {
      clearTimeout(timeoutId);
      reject(error);
    };
    reader.readAsArrayBuffer(file);
  });
};
