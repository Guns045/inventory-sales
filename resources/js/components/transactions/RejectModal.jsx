import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const REJECTION_REASONS = [
    { value: "No FU", label: "No FU (No Follow Up)" },
    { value: "No Stock", label: "No Stock" },
    { value: "Price", label: "Price Issue" }
];

export function RejectModal({ open, onOpenChange, onConfirm }) {
    const [reason, setReason] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");

    const handleConfirm = () => {
        if (!reason) {
            setError("Please select a rejection reason");
            return;
        }

        if (notes && notes.trim().length < 3) {
            setError("Notes must be at least 3 characters if provided");
            return;
        }

        setError("");
        onConfirm({ reason_type: reason, notes });
        // Reset form
        setReason("");
        setNotes("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Reject Quotation</DialogTitle>
                    <DialogDescription>
                        Please provide a reason for rejecting this quotation.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {error && (
                        <div className="text-sm text-red-500 font-medium">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="reason">Rejection Reason</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger id="reason">
                                <SelectValue placeholder="Select a reason..." />
                            </SelectTrigger>
                            <SelectContent>
                                {REJECTION_REASONS.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>
                                        {r.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add additional notes..."
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm}>
                        Reject Quotation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
