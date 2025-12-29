import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('idioms')
export class IdiomEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Index() // Index cho tìm kiếm chính xác
  @Column({ unique: true })
  hanzi: string;

  @Index() // Index cho tìm kiếm pinyin
  @Column()
  pinyin: string;

  @Column()
  type: string;

  @Column({ nullable: true })
  level: string;

  @Column({ nullable: true })
  source: string;

  // Chuyển sang text vì nghĩa có thể dài
  @Column({ type: 'text' })
  vietnameseMeaning: string;

  // Chuyển sang text
  @Column({ type: 'text', nullable: true })
  literalMeaning: string;

  @Column('text')
  figurativeMeaning: string;

  @Column({ type: 'text', nullable: true })
  chineseDefinition: string;

  @Column({ type: 'text', nullable: true })
  origin: string;

  @Column({ type: 'text', nullable: true })
  grammar: string;

  @Column({ nullable: true })
  imageUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => CharacterAnalysisEntity, (analysis) => analysis.idiom, {
    cascade: true,
  })
  analysis: CharacterAnalysisEntity[];

  @OneToMany(() => ExampleSentenceEntity, (example) => example.idiom, {
    cascade: true,
  })
  examples: ExampleSentenceEntity[];
}

@Entity('character_analysis')
export class CharacterAnalysisEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  character: string;

  @Column()
  pinyin: string;

  @Column()
  meaning: string;

  @ManyToOne(() => IdiomEntity, (idiom) => idiom.analysis, {
    onDelete: 'CASCADE',
  })
  idiom: IdiomEntity;
}

@Entity('example_sentences')
export class ExampleSentenceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  chinese: string;

  @Column()
  pinyin: string;

  @Column('text')
  vietnamese: string;

  @ManyToOne(() => IdiomEntity, (idiom) => idiom.examples, {
    onDelete: 'CASCADE',
  })
  idiom: IdiomEntity;
}
