import { Language, Question } from './model';

// Question bank carried over from the workspace branch.
const bank = {
  en: {
    beginner: [
      ["I ___ from Canada.", "am", "is", "are", "I 作主语时，be 动词用 am。"],
      ["The shop closes at six. Can you go there at seven?", "No, it is closed.", "Yes, it opens at seven.", "Yes, it is open until seven.", "closes at six 表示六点关门，所以七点去时已经关门。"],
      ["She ___ two brothers.", "has", "have", "having", "第三人称单数主语 she 与 has 搭配。"],
      ["There are three cups on the table. How many cups are there?", "Three", "Two", "Four", "three 就是三。"]
    ],
    intermediate: [
      ["If I ___ more time, I would take a course.", "had", "have", "will have", "用过去式和 would 表示与现状不同的假设。"],
      ["We set off early to avoid the traffic. Why did we leave early?", "To miss the traffic.", "To arrive during rush hour.", "Because the road was closed.", "avoid the traffic 表示避开拥堵。"],
      ["I have worked here ___ 2021.", "since", "for", "during", "since 后接起始时间点，for 后接一段时间。"],
      ["Even though the tickets were cheap, few people came. Which is true?", "Few people attended despite the low price.", "Many people came because the tickets were cheap.", "Attendance fell after prices rose.", "even though 引出让步，票价低但到场人数少。"]
    ],
    advanced: [
      ["Had the figures been checked, the discrepancy ___ before publication.", "would have been detected", "would detect", "will be detected", "Had the figures been checked 是省略 if 的过去虚拟条件，主句用 would have been。"],
      ["The findings are promising, insofar as the sample is representative. What limits the claim?", "Whether the sample represents the population.", "How quickly the results were published.", "Whether the findings were surprising.", "insofar as 将结论限定在样本有代表性的范围内。"],
      ["Not until the second review ___ the flaw.", "did they identify", "they identified", "had they been identified", "Not until 位于句首时，主句使用部分倒装 did they identify。"],
      ["The proposal was rejected, not for lack of merit, but because its timing was impractical. What does this imply?", "The proposal had value despite the rejection.", "The proposal was rejected because it had no value.", "The proposal's timing was viewed as ideal.", "not for lack of merit 排除了缺乏价值作为被拒绝的原因。"]
    ]
  },
  ja: {
    beginner: [
      ["わたしは 毎朝 7時（　）起きます。", "に", "を", "で", "具体的起床时间用助词「に」标记。"],
      ["「今日は火曜日です。」明日は何曜日ですか。", "水曜日", "月曜日", "木曜日", "星期二「火曜日」的次日是星期三「水曜日」。"],
      ["図書館（　）本を読みます。", "で", "に", "を", "表示动作发生的场所时，用助词「で」。"],
      ["「水を二つください。」いくつ頼みましたか。", "二つ", "一つ", "三つ", "「二つ」表示两个。"]
    ],
    intermediate: [
      ["道が混んでいた（　）、会議に遅れた。", "ため", "のに", "うえで", "「ため」在此表示原因，路上拥堵导致迟到。"],
      ["雨の予報だったので、試合は来週に延期されました。試合はいつ行われますか。", "来週", "今日", "先週", "「延期」表示推迟，新的时间是「来週」。"],
      ["家を出た（　）、電話が鳴った。", "とたん", "つもりで", "かわりに", "「～たとたん」表示前一动作刚发生，后一动作就紧接着发生。"],
      ["朝食は取らずに出かけた。何をしなかったのですか。", "朝食を取ること", "出かけること", "帰宅すること", "「～ずに」表示没有做前项就做了后项。"]
    ],
    advanced: [
      ["一度引き受けた（　）、最後まで責任を持つべきだ。", "以上", "に先立って", "に反して", "「～以上」在此表示既然承担了工作，就应负责到底。"],
      ["結果は肯定的だったものの、予備調査にすぎず、一般化には慎重であるべきだ。筆者の立場はどれですか。", "結果は有望だが、結論の適用範囲には注意が必要だ。", "結果が肯定的なので、広く当てはまることは確実だ。", "調査の結果そのものが否定的だった。", "「ものの」转折，「にすぎず」将调查限制在初步阶段。"],
      ["いくら経験が豊富であろう（　）、確認を省いてはならない。", "とも", "にしては", "ものなら", "「～であろうとも」表示无论条件如何，后项仍成立。"],
      ["制度そのものを否定するつもりはない。ただ、運用の透明性には改善の余地がある。何を問題にしていますか。", "制度を運用する過程が十分に明確ではないこと。", "制度を維持すること自体。", "制度を廃止する方針が示されたこと。", "后句把批评限定在制度运行的透明程度。"]
    ]
  },
  fr: {
    beginner: [
      ["Je ___ à Paris.", "suis", "est", "sommes", "être 与主语 je 搭配时用 suis。"],
      ["Le magasin ferme à dix-huit heures. Est-il ouvert à dix-neuf heures ?", "Non, il est fermé.", "Oui, il vient d’ouvrir.", "Oui, il ferme à vingt heures.", "fermer à dix-huit heures 是十八点关门，十九点已关门。"],
      ["Nous ___ deux cafés, s’il vous plaît.", "voudrions", "voudrait", "voudriez", "与 nous 搭配的礼貌点单用 voudrions。"],
      ["« Il y a quatre chaises. » Combien y a-t-il de chaises ?", "Quatre", "Trois", "Cinq", "quatre 表示四。"]
    ],
    intermediate: [
      ["Si j’avais plus de temps, je ___ davantage.", "lirais", "lirai", "lisais", "si 从句用未完成过去时，主句用条件式现在时表达假设。"],
      ["Le train est supprimé. Les voyageurs sont invités à prendre le prochain. Que doivent-ils faire ?", "Prendre le train suivant.", "Acheter un billet pour hier.", "Attendre le départ du même train.", "le prochain 指下一班，supprimé 表示本班取消。"],
      ["Elle travaille ici ___ 2020.", "depuis", "il y a", "pendant", "depuis 接起始时间，表示仍持续的动作。"],
      ["Bien que le trajet soit long, il préfère y aller à pied. Qu’est-ce qui est vrai ?", "Il préfère marcher malgré la distance.", "Il marche parce que le trajet est court.", "Il refuse de marcher à cause de la distance.", "bien que 表示让步，路程虽长，他还是偏爱步行。"]
    ],
    advanced: [
      ["À supposer que les données ___ fiables, l’interprétation resterait discutable.", "soient", "sont", "seront", "à supposer que 引出假设，从句用虚拟式。"],
      ["La mesure ne saurait être reconduite sans réexamen. Que signifie cette phrase ?", "La reconduction exige un nouvel examen.", "La reconduction est d’ores et déjà acquise.", "L’examen interdit toute reconduction.", "ne saurait … sans … 表示若没有后项，前项便不可行。"],
      ["Encore faut-il que chacun ___ accès aux données.", "ait", "a", "aura", "il faut que 后接虚拟式；avoir 的第三人称单数为 ait。"],
      ["L’auteur ne conteste pas le principe, mais en relativise la portée. Quelle est sa position ?", "Il accepte le principe tout en en limitant la portée.", "Il rejette totalement le principe.", "Il estime que le principe s’applique sans limite.", "relativiser la portée 表示认为其应用有边界。"]
    ]
  }
};

export function selfTestQuestions(language: Language, attempt: number): Question[] {
  const offset = (attempt % 2) * 2;
  return Object.values(bank[language]).flatMap(items => items.slice(offset, offset + 2).map(
    ([prompt, correct, distractorOne, distractorTwo, explanation]) => {
      const choices = [correct, distractorOne, distractorTwo];
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      return { prompt, choices, answer: choices.indexOf(correct), explanation };
    },
  ));
}
