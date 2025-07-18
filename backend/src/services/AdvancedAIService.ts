import OpenAI from 'openai';

// Import genre instructions directly
const genreInstructions: Record<string, Record<string, string>> = {
  SCIENCE_FICTION: {
    SPACE_OPERA: "Grand scale adventures spanning galaxies, empires, and civilizations. Epic conflicts between vast political entities (galactic empires, federations, alliances). Advanced technology: faster-than-light travel, energy weapons, terraforming, AI. Heroic protagonists on galaxy-spanning quests or missions. Multiple worlds, alien species, and diverse cultures. Themes of exploration, destiny, honor, and the fate of civilizations. Large cast of characters with clear heroic and villainous archetypes. Spectacular space battles and planetary conflicts. Ancient mysteries, lost technologies, or prophetic elements.",
    CYBERPUNK: "High-tech, low-life setting in near-future dystopian society. Corporate dominance over government and individual freedom. Advanced computer technology, virtual reality, neural interfaces. Protagonists are typically hackers, mercenaries, or outcasts. Urban decay contrasted with gleaming corporate towers. Themes of identity, consciousness, and what makes us human. Body modification, cybernetic implants, and digital consciousness. Surveillance state and loss of privacy. Underground resistance against corporate/governmental control.",
    DYSTOPIAN: "Oppressive society where individual freedom is restricted. Totalitarian government or corporate control over citizens. Surveillance, propaganda, and thought control. Protagonist awakens to the truth about their society. Themes of rebellion, freedom, truth vs. control. Dark atmosphere but with hope for change. Technology used for control rather than liberation. Character growth through resistance and awakening. Exploration of what makes us human when humanity is suppressed.",
    HARD_SCIENCE_FICTION: "Scientifically accurate and plausible technology and scenarios. Detailed explanations of scientific concepts integrated naturally. Characters who are scientists, engineers, or researchers. Exploration of the implications of scientific advancement. Realistic space travel, physics, and biological concepts. Wonder at the complexity and beauty of the universe. Ethical questions about the use of technology. Balance technical accuracy with compelling storytelling. Exploration of humanity's place in the cosmos.",
    TIME_TRAVEL: "Exploration of temporal mechanics and their consequences. Paradoxes, timeline changes, and causality loops. Characters dealing with knowledge of future/past events. Moral dilemmas about changing history. Multiple timelines or alternate realities. Themes of fate, free will, and the nature of time. Scientific or fantastical methods of time travel. Consequences of temporal interference. Character development across different time periods."
  },
  FANTASY: {
    EPIC_FANTASY: "Large-scale quest or battle between good and evil. Rich world-building with detailed magic systems and cultures. Prophetic elements and divine calling/destiny. Multiple character viewpoints and complex plots. Themes of sacrifice, courage, and divine providence. Magic that reflects spiritual truths and higher powers. Clear distinction between good and evil forces. Character growth through trials and spiritual development. Hope triumphing over darkness through perseverance. Ancient lore, mythical creatures, and legendary artifacts.",
    URBAN_FANTASY: "Modern-day setting with hidden magical/supernatural elements. Protagonist discovers or deals with supernatural threats. Fast-paced action mixed with character development. Themes of spiritual warfare and unseen realms. Magic coexisting with technology in contemporary world. Supernatural beings living among ordinary humans. Modern challenges addressed through magical solutions. Balance between supernatural action and real-world problems. Character growth through accepting their supernatural destiny. Hidden magical communities and their politics.",
    DARK_FANTASY: "Darker tone with horror and supernatural elements. Characters facing genuine spiritual darkness and evil. Themes of redemption conquering even the darkest evil. Gothic or horror atmosphere with elements of hope. Characters tested by encounters with true evil. Light piercing through the deepest darkness. Moral complexity and difficult choices. Characters strengthened through overcoming darkness. Evil portrayed as real but ultimately defeatable. Hope and meaning preserved despite dark themes.",
    ROMANTIC_FANTASY: "Central romantic relationship integral to the plot. Fantasy elements that enhance the romantic storyline. Themes of sacrificial love and commitment. Magic that brings lovers together or tests their bond. Romance that honors principles of true love. Magical elements that symbolize spiritual truths about love. Character growth through love and partnership. Challenges that strengthen rather than threaten the relationship. Love as a powerful force that can overcome evil. Fantasy world that reflects the beauty of true love."
  },
  ROMANCE: {
    CONTEMPORARY_ROMANCE: "Modern-day setting with realistic characters and situations. Central romantic relationship with strong character development. Faith and values central to character decisions. Characters who grow spiritually through their relationship. Realistic challenges that test and strengthen their bond. Purity and honor in physical and emotional intimacy. Prayer, scripture, and faith community play important roles. Themes of forgiveness, trust, and unconditional love. Authentic human struggles with hope and redemption. Happy ending that honors moral principles.",
    HISTORICAL_ROMANCE: "Accurate historical setting with rich period details. Characters whose faith reflects the time period appropriately. Historical challenges that test love and faith. Themes appropriate to the historical context. Courtship and marriage customs of the era. Women's roles and societal expectations historically accurate. Faith practices and religious life of the time period. Historical events that impact the romantic storyline. Period-appropriate language and social dynamics. Research-based authenticity in customs and daily life.",
    PARANORMAL_ROMANCE: "Supernatural elements from a positive worldview. Angels, prophetic gifts, or spiritual warfare themes. Romance tested by supernatural challenges. Biblical perspective on spiritual gifts and supernatural events. Faith as protection and guidance in supernatural situations. Avoid occult elements - focus on divine supernatural power. Characters with spiritual gifts used for good purposes. Themes of divine protection and providence. Supernatural elements that strengthen rather than threaten faith. Love that transcends physical realm and honors higher powers.",
    ROMANTIC_SUSPENSE: "Central romantic relationship developed amid danger/mystery. Fast-paced plot with romantic and suspenseful elements. Characters who protect and support each other. Faith as a source of strength during dangerous situations. Prayer and divine protection in life-threatening moments. Themes of trust, courage, and relying on higher power. Romance that deepens through shared trials. Realistic danger that tests character and faith. Providence evident in protection and resolution. Balance between romantic development and suspenseful plot."
  },
  MYSTERY: {
    COZY_MYSTERY: "Amateur sleuth in small-town or close-knit community setting. Minimal violence with puzzle-solving focus. Strong sense of community and fellowship. Characters who support each other through investigation. Faith community helps solve mysteries and provides support. Themes of truth, justice, and community responsibility. Prayer and wisdom seeking in investigation process. Gentle humor and warm relationships. Resolution that brings justice and healing to the community. Focus on character relationships and spiritual growth.",
    HARD_BOILED_MYSTERY: "Gritty, realistic detective work in urban setting. Morally complex characters seeking truth and justice. Detective/protagonist with strong moral compass. Themes of justice, redemption, and fighting corruption. Faith tested by exposure to human darkness and evil. Grace and forgiveness even for criminals and enemies. Realistic portrayal of crime's impact on community. Detective work as a calling to serve truth and protect others. Hope and redemption possible even in darkest situations. Balance realism with hope and moral values.",
    POLICE_PROCEDURAL: "Realistic police work and investigation procedures. Team dynamics and professional relationships. Officers using faith to guide their work decisions. Themes of service, protection, and seeking justice. Prayer and wisdom in difficult moral decisions. Balancing law enforcement with compassion. Supporting victims and their families through crisis. Professional integrity and moral courage in difficult situations. Faith community supporting officers and their families. Resolution that serves both justice and mercy.",
    PSYCHOLOGICAL_MYSTERY: "Deep exploration of character motivations and mental states. Complex psychological puzzles and character development. Themes of healing, forgiveness, and psychological restoration. Counseling or pastoral care elements in the story. Mental health portrayed with compassion and understanding. Faith as healing and strength in psychological struggles. Realistic portrayal of trauma and recovery processes. Hope for healing and wholeness through divine love. Professional help combined with spiritual support. Resolution that brings both understanding and emotional healing."
  },
  THRILLER: {
    PSYCHOLOGICAL_THRILLER: "Intense mental and emotional tension and suspense. Characters facing psychological manipulation or mind games. Themes of truth versus deception and mental resilience. Faith as anchor in psychologically challenging situations. Characters maintaining sanity and moral clarity under pressure. Exploration of human psychology and mental strength. Hope and healing for psychological trauma and manipulation. Characters using spiritual resources to resist mental attacks. Resolution that restores mental peace and emotional health. Faith community providing support during psychological crisis.",
    MEDICAL_THRILLER: "Medical settings with life-and-death stakes. Healthcare professionals as heroes fighting medical corruption. Themes of healing, hope, and sanctity of life. Faith guiding medical ethics and patient care decisions. Characters balancing medical science with spiritual faith. Medical mysteries that threaten public health or individual lives. Characters fighting against medical corruption or malpractice. Hope for healing and medical breakthroughs that help humanity. Faith in divine healing working alongside medical intervention. Resolution that preserves life and medical integrity.",
    LEGAL_THRILLER: "High-stakes legal battles with moral implications. Lawyers or legal professionals fighting for justice. Themes of truth, justice, and moral law prevailing. Faith informing legal ethics and professional decisions. Characters using legal system to protect innocent and punish guilty. Corruption within legal system threatening justice. Characters willing to sacrifice for principle of justice. Legal procedures and courtroom drama with spiritual themes. Faith community supporting those fighting legal battles. Resolution that serves both legal justice and moral righteousness.",
    POLITICAL_THRILLER: "Government corruption and political intrigue. Characters fighting to preserve democratic values and freedom. Themes of service, sacrifice, and moral courage in politics. Faith guiding political decisions and public service. Characters standing for truth against political corruption. Political systems as flawed but necessary for ordered society. Characters willing to lose political power for moral principles. Faith informing understanding of government and civic duty. Political resolution that serves common good rather than special interests. Characters learning about faithful citizenship and public service."
  },
  HISTORICAL_FICTION: {
    MEDIEVAL: "Authentic medieval setting with historical accuracy. Characters living within medieval social and religious structure. Faith central to medieval worldview and daily life. Feudal relationships and medieval social hierarchy. Medieval crafts, agriculture, and economic systems. Religious practices and church life authentic to period. Medieval warfare, chivalry, and codes of honor. Characters navigating medieval political and social challenges. Historical events and figures influencing character lives. Medieval culture, customs, and belief systems accurately portrayed.",
    RENAISSANCE: "Renaissance period setting with cultural and artistic focus. Characters involved in Renaissance art, science, or politics. Faith expressed through Renaissance religious and cultural practices. Artistic patronage and Renaissance court life. Scientific discovery and intellectual advancement. Religious reformation and cultural change. Characters navigating changing social and religious landscape. Renaissance exploration and expanding world knowledge. Authentic portrayal of Renaissance daily life and customs. Historical figures and events influencing character development.",
    COLONIAL_AMERICA: "American colonial period with authentic historical detail. Characters building new life in challenging frontier conditions. Faith communities central to colonial survival and culture. Relationships between colonists and indigenous peoples. Colonial governance, trade, and economic development. Religious freedom and diverse faith communities. Characters facing challenges of colonial life and development. Historical accuracy in colonial customs, technology, and daily life. Colonial conflicts and political development. Characters contributing to development of American society and values.",
    CIVIL_WAR: "American Civil War period with historical accuracy. Characters affected by war's impact on families and communities. Faith sustaining characters through national crisis and personal loss. Moral questions about slavery, war, and national unity. Authentic portrayal of Civil War battles, politics, and social change. Characters on different sides learning about reconciliation. Home front challenges and community support during wartime. Historical figures and events influencing character lives. Post-war reconstruction and healing process. Characters learning about forgiveness and national restoration."
  },
  ADVENTURE: {
    TREASURE_HUNTING: "Quest for lost treasure or valuable artifacts. Characters motivated by discovery rather than greed. Themes of stewardship and responsible use of wealth. Faith guiding decisions about treasure and its proper use. Characters facing dangers and challenges in pursuit of treasure. Historical or archaeological elements adding authenticity. Team cooperation essential for successful treasure hunting. Characters learning about true treasure being relationships and character. Adventure settings in exotic or dangerous locations. Resolution that uses treasure for good purposes rather than personal gain.",
    SURVIVAL_ADVENTURE: "Characters facing life-threatening natural challenges. Themes of resilience, hope, and divine providence in extreme situations. Faith sustaining characters through overwhelming physical challenges. Characters helping each other survive against impossible odds. Realistic survival scenarios and authentic survival challenges. Characters demonstrating resourcefulness and determination. Faith providing hope when survival seems impossible. Community cooperation essential for group survival in harsh conditions. Resolution that demonstrates power of hope and human determination. Characters learning about dependence on divine help and mutual support.",
    EXPEDITION_ADVENTURE: "Scientific or exploratory expedition to unknown regions. Characters motivated by discovery and advancement of knowledge. Faith informing understanding of creation and scientific discovery. Team members with different skills contributing to expedition success. Characters facing unknown dangers and challenges in unexplored territory. Scientific accuracy in expedition planning and execution. Characters demonstrating courage and persistence in face of unknown. Discovery that benefits humanity rather than just expedition members. Resolution that advances human knowledge while respecting creation. Characters learning about wonder and mystery of created world.",
    RESCUE_ADVENTURE: "Characters working to rescue others from dangerous situations. Themes of sacrifice, courage, and putting others before self. Faith motivating characters to risk themselves for others. Characters using skills and resources to help those in need. Realistic rescue scenarios and authentic rescue challenges. Team cooperation essential for successful rescue operations. Characters demonstrating selfless service and heroic courage. Faith community providing support and prayer for rescue efforts. Resolution that successfully rescues those in danger. Characters learning about importance of service and sacrifice for others."
  },
  WESTERN: {
    FRONTIER_WESTERN: "American frontier setting with authentic historical detail. Characters building civilization in untamed wilderness. Faith communities central to frontier survival and moral order. Themes of justice, courage, and building better society. Characters demonstrating pioneer spirit and moral courage. Authentic portrayal of frontier life, challenges, and customs. Community cooperation essential for frontier survival and development. Characters contributing to establishment of law and order. Resolution that advances civilization while maintaining frontier values. Characters learning about importance of community and mutual dependence.",
    LAWMAN_WESTERN: "Sheriff, marshal, or law enforcement officer as protagonist. Characters maintaining law and order in frontier communities. Faith informing understanding of justice and moral law. Themes of service, protection, and moral courage in face of danger. Characters willing to risk safety to protect innocent and uphold justice. Authentic portrayal of frontier law enforcement and legal systems. Community support essential for effective law enforcement. Characters demonstrating integrity and moral courage in difficult situations. Resolution that establishes justice and protects community. Characters learning about importance of rule of law and moral authority.",
    RANCH_WESTERN: "Cattle ranching or farming operation as central setting. Characters building agricultural enterprises in challenging frontier conditions. Faith expressed through stewardship of land and livestock. Themes of hard work, perseverance, and family legacy. Characters demonstrating skills and knowledge of ranching and farming. Authentic portrayal of ranch life, cattle drives, and agricultural challenges. Family cooperation and multi-generational involvement in ranch operation. Characters facing challenges from weather, market forces, and conflicts. Resolution that establishes successful ranch operation and family legacy. Characters learning about stewardship and responsibility for land and animals.",
    OUTLAW_REDEMPTION: "Former outlaw seeking redemption and new life. Characters turning away from criminal past toward honest living. Faith central to transformation and redemption process. Themes of forgiveness, second chances, and moral transformation. Characters making restitution for past crimes and wrongs. Community acceptance and support for genuine repentance. Characters using skills from outlaw past to help rather than harm. Resolution that demonstrates possibility of complete redemption. Characters learning about grace, forgiveness, and new beginnings. Faith community providing support and accountability for transformation."
  },
  YOUNG_ADULT: {
    COMING_OF_AGE: "Teenager or young adult discovering identity and purpose. Characters facing typical challenges of growing up and maturing. Faith central to identity formation and life direction. Themes of personal growth, responsibility, and finding life purpose. Characters learning to make moral decisions independently. Realistic portrayal of teenage challenges and family dynamics. Faith community providing guidance and support during transition to adulthood. Characters developing talents and discovering calling in life. Resolution that demonstrates successful transition to mature adulthood. Characters learning about responsibility, integrity, and service to others.",
    HIGH_SCHOOL_DRAMA: "High school setting with authentic teenage challenges. Characters navigating social pressures and academic demands. Faith providing guidance for moral decisions and peer pressure. Themes of friendship, integrity, and standing for moral principles. Characters dealing with typical high school issues like dating and popularity. Realistic portrayal of high school culture and teenage relationships. Faith community providing alternative values to popular culture. Characters learning to maintain integrity despite social pressure. Resolution that demonstrates importance of character over popularity. Characters learning about lasting friendship and moral courage.",
    FIRST_LOVE: "Young adult experiencing first serious romantic relationship. Characters learning about healthy relationships and true love. Faith informing understanding of love, commitment, and relationships. Themes of purity, respect, and emotional maturity in relationships. Characters demonstrating healthy relationship skills and boundaries. Realistic portrayal of young adult romance and relationship challenges. Faith community providing guidance about relationships and marriage. Characters learning about sacrificial love and putting others first. Resolution that honors principles of healthy relationships. Characters learning about commitment, communication, and mutual respect.",
    COLLEGE_EXPERIENCE: "College or university setting with academic and social challenges. Characters discovering independence while maintaining values. Faith tested and strengthened through intellectual and social challenges. Themes of intellectual growth, personal development, and life preparation. Characters balancing academic demands with social life and relationships. Realistic portrayal of college culture and young adult independence. Faith community providing support during transition to independence. Characters learning to defend faith and values in challenging environment. Resolution that demonstrates successful college experience with maintained values. Characters learning about intellectual integrity and moral courage."
  },
  CONTEMPORARY_FICTION: {
    FAMILY_SAGA: "Multi-generational family story spanning decades. Characters dealing with family dynamics, traditions, and changes over time. Faith providing continuity and wisdom across generations. Themes of family legacy, forgiveness, and generational healing. Characters learning from previous generations while adapting to new circumstances. Realistic portrayal of family challenges and growth over time. Faith community providing stability and support across generations. Characters working to heal family wounds and build positive legacy. Resolution that demonstrates family love and forgiveness across generations. Characters learning about importance of family, heritage, and passing on values.",
    SMALL_TOWN_LIFE: "Contemporary small town setting with close-knit community. Characters dealing with benefits and challenges of small town living. Faith community central to small town culture and relationships. Themes of community, belonging, and mutual support. Characters knowing each other's histories and supporting each other through challenges. Realistic portrayal of small town dynamics and relationships. Faith expressed through community service and mutual care. Characters learning about importance of community and belonging. Resolution that strengthens community bonds and relationships. Characters learning about interdependence and mutual responsibility.",
    URBAN_DRAMA: "Contemporary city setting with urban challenges and opportunities. Characters navigating complex urban social and economic environment. Faith providing hope and community in often impersonal urban setting. Themes of community building, social justice, and urban ministry. Characters working to improve urban conditions and help neighbors. Realistic portrayal of urban life, challenges, and opportunities. Faith community providing support and service in urban environment. Characters demonstrating love and service to urban community. Resolution that builds community and improves urban conditions. Characters learning about social responsibility and urban ministry.",
    WORKPLACE_DRAMA: "Contemporary workplace setting with professional challenges. Characters balancing career demands with personal values and relationships. Faith informing professional ethics and workplace relationships. Themes of integrity, service, and using professional skills to help others. Characters demonstrating integrity and moral courage in workplace situations. Realistic portrayal of contemporary professional challenges and opportunities. Faith community providing support and guidance for professional life. Characters learning to integrate faith with professional responsibilities. Resolution that demonstrates successful professional life with maintained values. Characters learning about service, integrity, and professional ministry."
  },
  CHRISTIAN_FICTION: {
    BIBLICAL_FICTION: "Stories set in biblical times with historical accuracy. Characters from biblical narratives or living in biblical settings. Faith central to character motivation and story development. Themes of divine providence, obedience, and spiritual growth. Historically accurate portrayal of biblical culture and customs. Characters demonstrating faith and obedience in challenging circumstances. Biblical worldview informing all character decisions and plot development. Characters learning about divine nature and spiritual truth. Resolution that demonstrates divine faithfulness and providence. Characters growing in faith and understanding of divine purposes.",
    MISSIONARY_FICTION: "Characters serving as missionaries in cross-cultural settings. Faith motivating service and sacrifice for spreading divine truth. Themes of cross-cultural understanding, service, and spiritual impact. Characters adapting to new cultures while maintaining spiritual convictions. Realistic portrayal of missionary life and cross-cultural challenges. Characters demonstrating love and service to people of different cultures. Faith community providing support and prayer for missionary work. Characters learning about cultural sensitivity and effective spiritual ministry. Resolution that demonstrates positive spiritual and cultural impact. Characters learning about cross-cultural ministry and global spiritual responsibility.",
    PASTORAL_FICTION: "Pastor or church leader as main character dealing with ministry challenges. Faith central to ministry decisions and pastoral care. Themes of spiritual leadership, church growth, and pastoral care. Characters demonstrating spiritual maturity and leadership wisdom. Realistic portrayal of pastoral ministry and church life. Characters balancing pastoral responsibilities with personal life. Faith community providing support and accountability for spiritual leaders. Characters learning about spiritual leadership and pastoral ministry. Resolution that demonstrates effective ministry and spiritual growth. Characters learning about spiritual leadership and pastoral responsibility.",
    SPIRITUAL_WARFARE: "Characters engaged in spiritual battle against evil forces. Faith providing weapons and protection for spiritual combat. Themes of good versus evil and divine victory over darkness. Characters demonstrating spiritual authority and power through faith. Prayer, scripture, and spiritual community as primary weapons. Characters growing in spiritual maturity and authority. Faith community providing spiritual covering and support. Characters learning about spiritual realm and spiritual authority. Resolution that demonstrates divine victory over evil forces. Characters learning about spiritual warfare and divine protection."
  }
};

export interface NovelGenerationRequest {
  genre: string;
  subgenre: string;
  title: string;
  summary: string;
  wordCount: number;
  characterDescriptions?: string;
  plotOutline?: string;
  tone?: string;
  style?: string;
}

export interface ChapterGenerationRequest {
  novelId: string;
  chapterNumber: number;
  previousChapters: string[];
  plotOutline: string;
  characterDescriptions: string;
  wordCount: number;
  genre: string;
  subgenre: string;
}

export interface NovelOutline {
  title: string;
  summary: string;
  chapters: ChapterOutline[];
  characters: Character[];
  themes: string[];
  plotPoints: string[];
}

export interface ChapterOutline {
  chapterNumber: number;
  title: string;
  summary: string;
  keyEvents: string[];
  characterDevelopment: string[];
  wordCount: number;
}

export interface Character {
  name: string;
  description: string;
  role: string;
  arc: string;
  relationships: string[];
}

export class AdvancedAIService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate a complete novel outline based on genre, subgenre, and basic parameters
   */
  async generateNovelOutline(request: NovelGenerationRequest): Promise<NovelOutline> {
    const genreInstruction = this.getGenreInstruction(request.genre, request.subgenre);
    
    const prompt = `
Create a detailed novel outline for a ${request.subgenre} ${request.genre} novel.

Title: ${request.title}
Summary: ${request.summary}
Target Word Count: ${request.wordCount}
${request.characterDescriptions ? `Character Ideas: ${request.characterDescriptions}` : ''}
${request.plotOutline ? `Plot Ideas: ${request.plotOutline}` : ''}
${request.tone ? `Tone: ${request.tone}` : ''}
${request.style ? `Style: ${request.style}` : ''}

Genre Guidelines:
${genreInstruction}

Please create a comprehensive novel outline that includes:

1. REFINED TITLE AND SUMMARY
- Compelling title that fits the genre
- Expanded 2-3 paragraph summary

2. MAIN CHARACTERS (3-6 characters)
For each character provide:
- Name
- Physical description and personality
- Role in the story (protagonist, antagonist, supporting)
- Character arc and growth
- Key relationships with other characters

3. MAJOR THEMES
- 3-5 central themes that align with the genre
- How these themes will be explored throughout the story

4. PLOT STRUCTURE
- Inciting incident
- Rising action key points
- Climax
- Falling action
- Resolution

5. CHAPTER BREAKDOWN
Create ${Math.ceil(request.wordCount / 3000)} chapters (approximately 3000 words each):
For each chapter provide:
- Chapter number and title
- 2-3 sentence summary
- Key events that occur
- Character development moments
- Estimated word count

The outline should be compelling, well-structured, and true to the ${request.subgenre} ${request.genre} genre conventions.

Format your response as a valid JSON object with the following structure:
{
  "title": "string",
  "summary": "string",
  "characters": [
    {
      "name": "string",
      "description": "string",
      "role": "string",
      "arc": "string",
      "relationships": ["string"]
    }
  ],
  "themes": ["string"],
  "plotPoints": ["string"],
  "chapters": [
    {
      "chapterNumber": number,
      "title": "string", 
      "summary": "string",
      "keyEvents": ["string"],
      "characterDevelopment": ["string"],
      "wordCount": number
    }
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "system",
            content: "You are a professional novelist and editor with expertise in all genres. You create detailed, compelling novel outlines that serve as blueprints for full-length novels. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 4000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return JSON.parse(content) as NovelOutline;
    } catch (error) {
      console.error('Error generating novel outline:', error);
      throw new Error('Failed to generate novel outline');
    }
  }

  /**
   * Generate a single chapter based on the novel context and previous chapters
   */
  async generateChapter(request: ChapterGenerationRequest): Promise<string> {
    const genreInstruction = this.getGenreInstruction(request.genre, request.subgenre);
    
    const previousChapterContext = request.previousChapters.length > 0 
      ? `\nPREVIOUS CHAPTERS SUMMARY:\n${request.previousChapters.slice(-3).join('\n\n')}`
      : '';

    const prompt = `
Write Chapter ${request.chapterNumber} of a ${request.subgenre} ${request.genre} novel.

NOVEL CONTEXT:
${request.plotOutline}

CHARACTER DESCRIPTIONS:
${request.characterDescriptions}

TARGET WORD COUNT: ${request.wordCount} words

GENRE GUIDELINES:
${genreInstruction}
${previousChapterContext}

WRITING INSTRUCTIONS:
1. Write in an engaging, immersive narrative style appropriate for the genre
2. Include vivid descriptions, realistic dialogue, and strong character development
3. Advance the plot meaningfully while maintaining genre conventions
4. Show don't tell - use action and dialogue to reveal character and advance plot
5. Maintain consistent tone and style throughout
6. Create compelling scenes with proper pacing
7. End with appropriate chapter conclusion (hook, resolution, or transition)
8. Aim for approximately ${request.wordCount} words

Write the complete chapter with proper formatting, paragraph breaks, and dialogue. Do not include chapter titles or numbering - just the narrative content.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "system",
            content: "You are a bestselling novelist with expertise in all genres. You write compelling, immersive chapters that engage readers and advance the story. Your writing is polished, professional, and genre-appropriate."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.9,
        max_tokens: 4000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return content;
    } catch (error) {
      console.error('Error generating chapter:', error);
      throw new Error('Failed to generate chapter');
    }
  }

  /**
   * Generate multiple chapters in sequence with context awareness
   */
  async generateMultipleChapters(
    novelId: string,
    startChapter: number,
    endChapter: number,
    plotOutline: string,
    characterDescriptions: string,
    chapterWordCount: number,
    genre: string,
    subgenre: string,
    onProgressUpdate?: (chapter: number, content: string) => void
  ): Promise<string[]> {
    const chapters: string[] = [];
    
    for (let chapterNum = startChapter; chapterNum <= endChapter; chapterNum++) {
      const chapterContent = await this.generateChapter({
        novelId,
        chapterNumber: chapterNum,
        previousChapters: chapters.slice(-3), // Include last 3 chapters for context
        plotOutline,
        characterDescriptions,
        wordCount: chapterWordCount,
        genre,
        subgenre
      });
      
      chapters.push(chapterContent);
      
      // Call progress callback if provided
      if (onProgressUpdate) {
        onProgressUpdate(chapterNum, chapterContent);
      }
      
      // Add small delay to avoid rate limiting
      await this.delay(1000);
    }
    
    return chapters;
  }

  /**
   * Enhance and refine existing chapter content
   */
  async enhanceChapter(
    chapterContent: string,
    genre: string,
    subgenre: string,
    enhancementType: 'dialogue' | 'description' | 'pacing' | 'character_development' | 'overall'
  ): Promise<string> {
    const genreInstruction = this.getGenreInstruction(genre, subgenre);
    
    const enhancementPrompts = {
      dialogue: "Focus on improving dialogue - make it more natural, distinctive for each character, and purposeful in advancing plot or revealing character.",
      description: "Enhance descriptive passages - add vivid sensory details, stronger imagery, and atmospheric elements that immerse the reader.",
      pacing: "Improve pacing - balance action and reflection, vary sentence structure, and ensure smooth transitions between scenes.",
      character_development: "Strengthen character development - deepen characterization, show internal conflicts, and advance character arcs.",
      overall: "Provide overall enhancement - improve prose quality, strengthen narrative voice, and ensure genre consistency."
    };

    const prompt = `
Enhance and refine the following chapter from a ${subgenre} ${genre} novel.

ENHANCEMENT FOCUS: ${enhancementPrompts[enhancementType]}

GENRE GUIDELINES:
${genreInstruction}

ORIGINAL CHAPTER:
${chapterContent}

INSTRUCTIONS:
1. Maintain the original plot and key events
2. Keep the same general structure and length
3. ${enhancementPrompts[enhancementType]}
4. Ensure the enhanced version maintains genre conventions
5. Improve overall readability and engagement
6. Preserve character voices and narrative consistency

Provide the enhanced chapter with improved quality while maintaining the original story elements.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert literary editor specializing in enhancing novel manuscripts. You improve prose quality while preserving the author's voice and story integrity."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return content;
    } catch (error) {
      console.error('Error enhancing chapter:', error);
      throw new Error('Failed to enhance chapter');
    }
  }

  /**
   * Generate a compelling book summary/blurb for marketing purposes
   */
  async generateBookBlurb(
    title: string,
    summary: string,
    characters: Character[],
    themes: string[],
    genre: string,
    subgenre: string
  ): Promise<string> {
    const genreInstruction = this.getGenreInstruction(genre, subgenre);
    
    const prompt = `
Create a compelling book blurb/back cover description for a ${subgenre} ${genre} novel.

NOVEL DETAILS:
Title: ${title}
Summary: ${summary}
Main Characters: ${characters.map(c => `${c.name} - ${c.description}`).join('; ')}
Themes: ${themes.join(', ')}

GENRE GUIDELINES:
${genreInstruction}

INSTRUCTIONS:
1. Create a 150-200 word blurb that would appear on the back cover or in online descriptions
2. Hook readers immediately with compelling opening
3. Introduce the main character and central conflict
4. Build tension and stakes without spoiling the resolution  
5. End with a compelling question or cliffhanger
6. Use language and tone appropriate for the ${subgenre} ${genre} audience
7. Include emotional hooks that resonate with genre readers
8. Make readers want to immediately start reading

The blurb should be professionally written and market-ready.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "system",
            content: "You are a publishing marketing expert who writes compelling book blurbs that sell novels. Your blurbs hook readers and drive sales."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 300
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return content;
    } catch (error) {
      console.error('Error generating book blurb:', error);
      throw new Error('Failed to generate book blurb');
    }
  }

  /**
   * Get genre-specific writing instructions
   */
  private getGenreInstruction(genre: string, subgenre: string): string {
    const genreData = genreInstructions[genre.toUpperCase()];
    if (!genreData) {
      return "Write in a compelling, engaging style appropriate for general fiction.";
    }
    
    const subgenreInstruction = genreData[subgenre.toUpperCase()];
    return subgenreInstruction || genreData[Object.keys(genreData)[0]];
  }

  /**
   * Utility function to add delays between API calls
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate novel generation request
   */
  validateNovelRequest(request: NovelGenerationRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!request.title || request.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters long');
    }
    
    if (!request.summary || request.summary.trim().length < 50) {
      errors.push('Summary must be at least 50 characters long');
    }
    
    if (!request.genre || !genreInstructions[request.genre.toUpperCase()]) {
      errors.push('Valid genre is required');
    }
    
    if (request.genre && !genreInstructions[request.genre.toUpperCase()]?.[request.subgenre.toUpperCase()]) {
      errors.push('Valid subgenre is required for the selected genre');
    }
    
    if (!request.wordCount || request.wordCount < 10000 || request.wordCount > 200000) {
      errors.push('Word count must be between 10,000 and 200,000 words');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get available genres and subgenres
   */
  getAvailableGenres(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    
    for (const [genre, subgenres] of Object.entries(genreInstructions)) {
      result[genre] = Object.keys(subgenres as Record<string, string>);
    }
    
    return result;
  }

  /**
   * Estimate generation time and cost
   */
  estimateGenerationMetrics(wordCount: number): { 
    estimatedTime: string; 
    estimatedCost: string;
    chapterCount: number;
  } {
    const chapterCount = Math.ceil(wordCount / 3000);
    const estimatedMinutes = chapterCount * 2; // ~2 minutes per chapter
    const estimatedCost = (chapterCount * 0.50).toFixed(2); // ~$0.50 per chapter
    
    return {
      estimatedTime: `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`,
      estimatedCost: `$${estimatedCost}`,
      chapterCount
    };
  }
}
