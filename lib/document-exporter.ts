import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { Chapter } from './database';

export interface ExportOptions {
  title: string;
  author?: string;
  genre?: string;
  subgenre?: string;
  premise?: string;
}

export class DocumentExporter {
  // Export novel as .docx
  static async exportToDocx(
    chapters: Chapter[], 
    options: ExportOptions
  ): Promise<Buffer> {
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // Title page
              new Paragraph({
                children: [
                  new TextRun({
                    text: options.title,
                    bold: true,
                    size: 32,
                  }),
                ],
                heading: HeadingLevel.TITLE,
                alignment: 'center',
                spacing: {
                  after: 400,
                },
              }),
              
              ...(options.author ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `by ${options.author}`,
                      size: 24,
                    }),
                  ],
                  alignment: 'center',
                  spacing: {
                    after: 400,
                  },
                }),
              ] : []),

              ...(options.genre && options.subgenre ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${options.genre} / ${options.subgenre}`,
                      size: 20,
                      italics: true,
                    }),
                  ],
                  alignment: 'center',
                  spacing: {
                    after: 800,
                  },
                }),
              ] : []),

              // Page break before content
              new Paragraph({
                children: [new TextRun({ text: '', break: 1 })],
                pageBreakBefore: true,
              }),

              // Table of Contents (optional)
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Contents',
                    bold: true,
                    size: 24,
                  }),
                ],
                heading: HeadingLevel.HEADING_1,
                spacing: {
                  after: 200,
                },
              }),

              ...chapters.map((chapter, index) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Chapter ${index + 1}${chapter.title ? `: ${chapter.title}` : ''}`,
                      size: 20,
                    }),
                  ],
                  spacing: {
                    after: 100,
                  },
                })
              ),

              // Page break before chapters
              new Paragraph({
                children: [new TextRun({ text: '', break: 1 })],
                pageBreakBefore: true,
              }),

              // Chapters
              ...chapters.flatMap((chapter, index) => {
                const chapterParagraphs: Paragraph[] = [];

                // Chapter heading
                chapterParagraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `Chapter ${index + 1}${chapter.title ? `: ${chapter.title}` : ''}`,
                        bold: true,
                        size: 28,
                      }),
                    ],
                    heading: HeadingLevel.HEADING_1,
                    spacing: {
                      before: 400,
                      after: 400,
                    },
                  })
                );

                // Chapter content
                const paragraphs = chapter.content
                  .split('\n\n')
                  .filter(p => p.trim().length > 0);

                paragraphs.forEach(paragraphText => {
                  chapterParagraphs.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: paragraphText.trim(),
                          size: 24,
                        }),
                      ],
                      spacing: {
                        after: 200,
                      },
                      indent: {
                        firstLine: 720, // First line indent (0.5 inch)
                      },
                    })
                  );
                });

                // Page break after chapter (except last)
                if (index < chapters.length - 1) {
                  chapterParagraphs.push(
                    new Paragraph({
                      children: [new TextRun({ text: '', break: 1 })],
                      pageBreakBefore: true,
                    })
                  );
                }

                return chapterParagraphs;
              }),

              // End matter
              new Paragraph({
                children: [new TextRun({ text: '', break: 1 })],
                pageBreakBefore: true,
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: `Generated on ${new Date().toLocaleDateString()}`,
                    size: 20,
                    italics: true,
                  }),
                ],
                alignment: 'center',
                spacing: {
                  before: 400,
                },
              }),

              ...(options.premise ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Original Premise:',
                      bold: true,
                      size: 22,
                    }),
                  ],
                  spacing: {
                    before: 400,
                    after: 200,
                  },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: options.premise,
                      size: 20,
                    }),
                  ],
                  spacing: {
                    after: 200,
                  },
                }),
              ] : []),

              // Statistics
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Statistics:',
                    bold: true,
                    size: 22,
                  }),
                ],
                spacing: {
                  before: 400,
                  after: 200,
                },
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: `Total Chapters: ${chapters.length}`,
                    size: 20,
                  }),
                ],
                spacing: {
                  after: 100,
                },
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: `Total Word Count: ${chapters.reduce((sum, ch) => sum + ch.wordCount, 0).toLocaleString()}`,
                    size: 20,
                  }),
                ],
                spacing: {
                  after: 100,
                },
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: `Average Chapter Length: ${Math.round(chapters.reduce((sum, ch) => sum + ch.wordCount, 0) / chapters.length).toLocaleString()} words`,
                    size: 20,
                  }),
                ],
                spacing: {
                  after: 100,
                },
              }),
            ],
          },
        ],
      });

      return await Packer.toBuffer(doc);
    } catch (error) {
      // Log error appropriately based on environment
      if (process.env.NODE_ENV === 'development') {
        console.error('[DocumentExporter] Error exporting to DOCX:', error instanceof Error ? error.message : error);
      }
      throw new Error(`Failed to export document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate filename for export
  static generateFilename(title: string): string {
    const sanitizedTitle = title
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
    
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${sanitizedTitle}_${timestamp}.docx`;
  }

  // Calculate reading statistics
  static calculateStats(chapters: Chapter[]) {
    const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
    const averageWordsPerChapter = chapters.length > 0 ? totalWords / chapters.length : 0;
    const estimatedReadingTime = Math.ceil(totalWords / 250); // Assuming 250 words per minute

    return {
      totalChapters: chapters.length,
      totalWords,
      averageWordsPerChapter: Math.round(averageWordsPerChapter),
      estimatedReadingTimeMinutes: estimatedReadingTime,
      estimatedReadingTimeHours: Math.round(estimatedReadingTime / 60 * 10) / 10,
    };
  }
}
