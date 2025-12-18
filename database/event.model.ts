import { Schema, model, models, Model } from 'mongoose';

/**
 * Event document shape used by Mongoose and TypeScript.
 */
export interface IEvent {
    title: string;
    slug: string;
    description: string;
    overview: string;
    image: string;
    venue: string;
    location: string;
    date: string; // normalized to ISO date (YYYY-MM-DD)
    time: string; // normalized to HH:mm (24h)
    mode: string;
    audience: string;
    agenda: string[];
    organizer: string;
    tags: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Simple slugify: lowercases, replaces non-alphanumerics with hyphens,
 * collapses multiple hyphens, and trims edge hyphens.
 */
function slugify(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/--+/g, '-');
}

/**
 * Normalize date to ISO date string (YYYY-MM-DD).
 * Throws if the date is invalid.
 */
function normalizeDate(value: string): string {
    const trimmed = value.trim();
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) {
        throw new Error('Invalid date format');
    }
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Normalize time to 24h HH:mm.
 * Supports "HH:mm", "H:mm", "HH:mm:ss", "h am/pm", "hham" formats.
 */
function normalizeTime(value: string): string {
    const v = value.trim().toLowerCase();

    // HH:mm or H:mm or HH:mm:ss
    const colon = v.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (colon) {
        const h = parseInt(colon[1], 10);
        const m = parseInt(colon[2], 10);
        if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error('Invalid time value');
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    // h am/pm or hh am/pm or hham/hhpm
    const ampm = v.match(/^(\d{1,2})\s*(am|pm)$/) || v.match(/^(\d{1,2})(am|pm)$/);
    if (ampm) {
        let h = parseInt(ampm[1], 10);
        const suffix = ampm[2];
        if (h < 1 || h > 12) throw new Error('Invalid time hour');
        if (suffix === 'pm' && h !== 12) h += 12;
        if (suffix === 'am' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:00`;
    }

    throw new Error('Invalid time format');
}

/**
 * Helper to validate non-empty trimmed strings.
 */
const nonEmptyString = (v: string): boolean => typeof v === 'string' && v.trim().length > 0;

/**
 * Trim strings inside an array and ensure all are non-empty.
 */
const arrayOfNonEmptyStrings = (arr: unknown): arr is string[] => {
    if (!Array.isArray(arr)) return false;
    return arr.length > 0 && arr.every((v) => typeof v === 'string' && v.trim().length > 0);
};

const EventSchema = new Schema<IEvent>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            validate: { validator: nonEmptyString, message: 'Title cannot be empty' },
        },
        slug: {
            type: String,
            unique: true, // unique slug per event
            index: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            validate: { validator: nonEmptyString, message: 'Description cannot be empty' },
        },
        overview: {
            type: String,
            required: true,
            trim: true,
            validate: { validator: nonEmptyString, message: 'Overview cannot be empty' },
        },
        image: {
            type: String,
            required: true,
            trim: true,
            validate: { validator: nonEmptyString, message: 'Image cannot be empty' },
        },
        venue: {
            type: String,
            required: true,
            trim: true,
            validate: { validator: nonEmptyString, message: 'Venue cannot be empty' },
        },
        location: {
            type: String,
            required: true,
            trim: true,
            validate: { validator: nonEmptyString, message: 'Location cannot be empty' },
        },
        date: {
            type: String,
            required: true,
            trim: true,
            validate: { validator: nonEmptyString, message: 'Date cannot be empty' },
        },
        time: {
            type: String,
            required: true,
            trim: true,
            validate: { validator: nonEmptyString, message: 'Time cannot be empty' },
        },
        mode: {
            type: String,
            required: true,
            trim: true,
            validate: { validator: nonEmptyString, message: 'Mode cannot be empty' },
        },
        audience: {
            type: String,
            required: true,
            trim: true,
            validate: { validator: nonEmptyString, message: 'Audience cannot be empty' },
        },
        agenda: {
            type: [String],
            required: true,
            validate: {
                validator: arrayOfNonEmptyStrings,
                message: 'Agenda must be a non-empty array of strings',
            },
            set: (v: string[]) => (Array.isArray(v) ? v.map((s) => s.trim()) : v),
        },
        organizer: {
            type: String,
            required: true,
            trim: true,
            validate: { validator: nonEmptyString, message: 'Organizer cannot be empty' },
        },
        tags: {
            type: [String],
            required: true,
            validate: {
                validator: arrayOfNonEmptyStrings,
                message: 'Tags must be a non-empty array of strings',
            },
            set: (v: string[]) => (Array.isArray(v) ? v.map((s) => s.trim()) : v),
        },
    },
    {
        timestamps: true, // auto manage createdAt/updatedAt
        strict: true,
    }
);

// Unique index on slug (defense-in-depth; also set at path as unique)
EventSchema.index({ slug: 1 }, { unique: true });

/**
 * Pre-save hook:
 * - Generate slug from title ONLY if title changed or slug missing.
 * - Normalize date to ISO (YYYY-MM-DD).
 * - Normalize time to HH:mm 24h.
 * - Sanity trim arrays to remove accidental empties.
 */
EventSchema.pre('save', async function () {
    try {
        if (this.isModified('title') || !this.slug) {
            this.slug = slugify(this.title);
        }

        // Normalize date/time consistently
        if (this.isModified('date')) {
            this.date = normalizeDate(this.date);
        }
        if (this.isModified('time')) {
            this.time = normalizeTime(this.time);
        }

        // Clean agenda/tags entries
        if (Array.isArray(this.agenda)) {
            this.agenda = this.agenda.map((s) => s.trim()).filter((s) => s.length > 0);
        }
        if (Array.isArray(this.tags)) {
            this.tags = this.tags.map((s) => s.trim()).filter((s) => s.length > 0);
        }

        // Validate again for non-empty required strings
        const requiredStrings: Array<keyof IEvent> = [
            'title',
            'description',
            'overview',
            'image',
            'venue',
            'location',
            'date',
            'time',
            'mode',
            'audience',
            'organizer',
        ];
        for (const key of requiredStrings) {
            const val = this[key] as unknown;
            if (typeof val !== 'string' || val.trim().length === 0) {
                throw new Error(`Field "${key}" is required and cannot be empty`);
            }
        }

        // Ensure arrays are present and non-empty
        if (!Array.isArray(this.agenda) || this.agenda.length === 0) {
            throw new Error('Agenda is required and cannot be empty');
        }
        if (!Array.isArray(this.tags) || this.tags.length === 0) {
            throw new Error('Tags are required and cannot be empty');
        }

    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Error in Event pre-save hook');
    }
});

export const Event: Model<IEvent> =
    (models.Event as Model<IEvent>) || model<IEvent>('Event', EventSchema);