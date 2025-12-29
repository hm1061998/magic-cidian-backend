/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, HttpException } from '@nestjs/common';
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
      console.warn('API_KEY is not set in environment variables');
      // throw new Error('API_KEY is not set in environment variables');
    }
  }

  async findAll(page: number = 1, limit: number = 12, filter: string = '') {
    const skip = (page - 1) * limit;

    // Xây dựng điều kiện tìm kiếm nếu có filter
    const whereCondition = filter
      ? [
          { hanzi: ILike(`%${filter}%`) },
          { pinyin: ILike(`%${filter}%`) },
          { vietnameseMeaning: ILike(`%${filter}%`) },
        ]
      : {};

    const [data, total] = await this.idiomRepository.findAndCount({
      where: whereCondition,
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'hanzi',
        'pinyin',
        'vietnameseMeaning',
        'type',
        'level',
        'source',
      ],
      take: limit,
      skip: skip,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async search(query: string, mode: SearchMode) {
    if (mode === 'ai') {
      return this.callGeminiAI(query);
    } else {
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
    }

    throw new HttpException('Không tìm thấy từ này trong thư viện.', 400);
  }

  async create(createIdiomDto: CreateIdiomDto) {
    // 1. Kiểm tra xem từ đã tồn tại chưa
    const existing = await this.idiomRepository.findOne({
      where: { hanzi: createIdiomDto.hanzi },
      relations: ['analysis', 'examples'], // Load quan hệ để orphanRemoval hoạt động đúng
    });

    if (existing) {
      // 2. Nếu TỒN TẠI: Cập nhật (Update)
      // Merge thông tin cơ bản
      this.idiomRepository.merge(existing, createIdiomDto);

      // Gán lại mảng quan hệ để kích hoạt orphanRemoval (xóa cũ, thêm mới)
      // Dùng 'as any' để bypass check type strict của TypeORM khi gán DTO object vào Entity relation
      existing.analysis = (createIdiomDto.analysis || []) as any;
      existing.examples = (createIdiomDto.examples || []) as any;

      return await this.idiomRepository.save(existing);
    }

    createIdiomDto.createdAt = `${new Date().getTime() / 1000}`;
    // 3. Nếu CHƯA TỒN TẠI: Tạo mới (Insert)
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

    try {
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
    } catch (err) {
      console.error('Chưa cấu hình mô hình AI');
      throw new HttpException('Chưa cấu hình mô hình AI', 400);
    }
  }
}
