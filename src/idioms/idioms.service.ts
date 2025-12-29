/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, ConflictException, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { IdiomEntity } from './entities/idiom.entity';
import { GoogleGenAI, Type } from '@google/genai';
import { CreateIdiomDto } from './dto/create-idiom.dto';
import { SearchMode } from './idioms.controller';

@Injectable()
export class IdiomsService {
  private ai: GoogleGenAI;

  constructor(
    @InjectRepository(IdiomEntity)
    private readonly idiomRepository: Repository<IdiomEntity>,
  ) {
    if (process.env.API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
      // throw new Error('API_KEY is not set in environment variables');
    }
  }

  async findOne(query: string, mode: SearchMode) {
    const normalizedQuery = query.toLowerCase().trim();

    const dbIdiom = await this.idiomRepository.findOne({
      where: [
        { hanzi: normalizedQuery },
        { pinyin: ILike(`%${normalizedQuery}%`) },
        { vietnameseMeaning: ILike(`%${normalizedQuery}%`) },
      ],
      relations: ['analysis', 'examples'],
    });

    if (dbIdiom) {
      return { ...dbIdiom, dataSource: 'database' };
    }

    if (mode === 'ai') {
      return this.callGeminiAI(query);
    }

    throw new HttpException('Không tìm thấy từ này trong thư viện.', 400);
  }

  async create(createIdiomDto: CreateIdiomDto) {
    // Kiểm tra trùng lặp dựa trên Hanzi
    const existing = await this.idiomRepository.findOne({
      where: { hanzi: createIdiomDto.hanzi },
    });

    if (existing) {
      throw new ConflictException(
        `Thành ngữ "${createIdiomDto.hanzi}" đã tồn tại.`,
      );
    }

    // Do entity đã config cascade: true, việc lưu idiom sẽ tự động lưu cả analysis và examples
    const newIdiom = this.idiomRepository.create(createIdiomDto);
    return await this.idiomRepository.save(newIdiom);
  }

  private async callGeminiAI(query: string) {
    const schema = {
      type: Type.OBJECT,
      properties: {
        hanzi: { type: Type.STRING },
        pinyin: { type: Type.STRING },
        type: { type: Type.STRING },
        level: { type: Type.STRING },
        source: { type: Type.STRING },
        vietnameseMeaning: { type: Type.STRING },
        literalMeaning: { type: Type.STRING },
        figurativeMeaning: { type: Type.STRING },
        chineseDefinition: { type: Type.STRING },
        origin: { type: Type.STRING },
        grammar: { type: Type.STRING },
        analysis: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              character: { type: Type.STRING },
              pinyin: { type: Type.STRING },
              meaning: { type: Type.STRING },
            },
          },
        },
        examples: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              chinese: { type: Type.STRING },
              pinyin: { type: Type.STRING },
              vietnamese: { type: Type.STRING },
            },
          },
        },
      },
    };

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Phân tích chuyên sâu quán dụng ngữ/thành ngữ tiếng Trung: "${query}". Trả về kết quả JSON theo schema hỗ trợ người Việt học tập.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const text = response.text || '{}';
    // Loại bỏ markdown code block nếu AI lỡ thêm vào (dù đã set json mode)
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();

    try {
      const data = JSON.parse(cleanJson);
      return { ...data, dataSource: 'ai' };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      console.error('Failed to parse JSON from AI', cleanJson);
      throw new Error('AI trả về dữ liệu không hợp lệ.');
    }
  }
}
