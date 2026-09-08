import type { AnswerReviewItem } from "@/lib/exam";

const RESULT_STYLE = {
  correct: "border-success bg-success-light",
  wrong: "border-danger bg-danger-light",
  blank: "border-line bg-off-white",
} as const;

const RESULT_LABEL = {
  correct: "Correct",
  wrong: "Incorrect",
  blank: "Not answered",
} as const;

const RESULT_TEXT = {
  correct: "text-success",
  wrong: "text-danger",
  blank: "text-muted",
} as const;

export function ExamAnswerReview({
  items,
  chosenLabel = "your answer",
  blankLabel = "You left this blank.",
}: {
  items: AnswerReviewItem[];
  chosenLabel?: string;
  blankLabel?: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-muted">No questions found for this review.</p>;
  }

  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li
          key={item.questionId}
          className={`rounded-xl border px-4 py-4 ${RESULT_STYLE[item.result]}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium">
              {item.number}. {item.text}
            </p>
            <span className={`shrink-0 text-sm font-medium ${RESULT_TEXT[item.result]}`}>
              {RESULT_LABEL[item.result]}
            </span>
          </div>

          <ul className="mt-3 space-y-1.5 text-sm">
            {item.options.map((option, optionIndex) => {
              const isCorrect = optionIndex === item.correctIndex;
              const isChosen = item.chosenIndex === optionIndex;
              return (
                <li
                  key={optionIndex}
                  className={
                    isCorrect
                      ? "font-medium text-success"
                      : isChosen
                        ? "font-medium text-danger"
                        : "text-muted"
                  }
                >
                  {String.fromCharCode(65 + optionIndex)}. {option}
                  {isCorrect ? " · correct answer" : ""}
                  {isChosen ? ` · ${chosenLabel}` : ""}
                </li>
              );
            })}
          </ul>

          {item.result === "blank" ? (
            <p className="mt-2 text-sm text-muted">
              {blankLabel} Correct answer:{" "}
              <b className="text-success">
                {String.fromCharCode(65 + item.correctIndex)}. {item.options[item.correctIndex]}
              </b>
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
