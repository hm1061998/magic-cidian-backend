export class CreateCharacterAnalysisDto {
  character: string;
  pinyin: string;
  meaning: string;
}

export class CreateExampleSentenceDto {
  chinese: string;
  pinyin: string;
  vietnamese: string;
}

export class CreateIdiomDto {
  hanzi: string;
  pinyin: string;
  type: string;
  level?: string;
  source?: string;
  vietnameseMeaning: string;
  literalMeaning?: string;
  figurativeMeaning: string;
  chineseDefinition?: string;
  origin?: string;
  grammar?: string;
  imageUrl?: string;
  analysis?: CreateCharacterAnalysisDto[];
  examples?: CreateExampleSentenceDto[];
}
