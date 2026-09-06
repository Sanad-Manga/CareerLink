const mongoose = require("mongoose");

const jobPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    company: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    requirements: {
        type: [String],
        required: true
    },
    location: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["full-time", "part-time", "internship"],
        required: true
    },
   
    createdBy :{
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User",
        required: true
    },
    salary: {
        type: Number,
    },
    category: {
        type: String,
        enum: ["Frontend", "Backend", "AI/ML", "DevOps", "Data Engineering", "Other"],
    },
    totalSlots: {
        type: Number,
        default: 1,
    },
    status: {
        type: String,
        enum: ["open", "closed"],
        default: "open",
    },

        embedding: {
        type: [Number],
        select: false,
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
    },


    


});
module.exports = mongoose.model("JobPost", jobPostSchema);


