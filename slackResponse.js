module.exports = {
  base: function(text, in_channel) {
    var result = {
      "text": text,
      "attachments": [
      ]
    };

    if (in_channel) {
      result.response_type = in_channel;
    }

    return result;
  }
};