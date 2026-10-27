import { useEffect, useId, useRef, useState } from "react";
import { ShieldCheck, TriangleAlert, X } from "lucide-react";
import type { Measurement } from "./domain";

export type MeasurementAction = {
  kind: "void" | "review";
  record: Measurement;
};

export function MeasurementActionDialog({
  action,
  error,
  onCancel,
  onConfirm,
}: {
  action: MeasurementAction;
  error: string;
  onCancel: () => void;
  onConfirm: (actor: string, reason: string) => boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const voiding = action.kind === "void";
  const [actor, setActor] = useState(voiding ? action.record.operator : "");
  const [reason, setReason] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  const valid =
    actor.trim().length > 0 && (!voiding || reason.trim().length > 0);
  return (
    <dialog
      ref={dialog}
      className="measurement-action-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !onConfirm(actor.trim(), reason.trim())) setFailed(true);
        }}
      >
        <div className="section-heading">
          <div className={"action-dialog-icon " + (voiding ? "bad" : "good")}>
            {voiding ? <TriangleAlert size={22} /> : <ShieldCheck size={22} />}
          </div>
          <button
            type="button"
            className="text-button"
            aria-label="Cerrar diálogo"
            onClick={onCancel}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id={`${id}-title`}>
          {voiding ? "Anular medición" : "Documentar revisión"}
        </h2>
        <p id={`${id}-description`}>
          {voiding
            ? "La medición dejará de aparecer en el historial activo y en los cálculos. Sus datos y el motivo se conservarán en la trazabilidad."
            : "Confirma que revisaste las lecturas y los criterios aplicados a esta medición."}
        </p>
        <div className="action-record">
          <strong>{action.record.id}</strong>
          <span>
            {action.record.product} · Lote {action.record.lot}
          </span>
        </div>
        <label>
          Responsable *
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            required
            autoFocus={!voiding}
            autoComplete="name"
          />
        </label>
        <label>
          {voiding
            ? "Motivo de la anulación *"
            : "Notas de revisión (opcional)"}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required={voiding}
            autoFocus={voiding}
            placeholder={
              voiding
                ? "Describe por qué se anula esta medición…"
                : "Observaciones de la revisión…"
            }
          />
        </label>
        {failed && (
          <p role="alert" className="error">
            {error || "No se guardaron los cambios. Inténtalo de nuevo."}
          </p>
        )}
        <div className="action-dialog-buttons">
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="submit"
            className={voiding ? "destructive" : "primary"}
            disabled={!valid}
          >
            {voiding ? "Confirmar anulación" : "Confirmar revisión"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
