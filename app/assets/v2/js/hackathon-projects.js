// document.result.pk
const projectModal = (bountyId, projectId) => {
  $('#modalProject').bootstrapModal('hide');
  const modalUrl = projectId ? `/modal/new_project/${bountyId}/${projectId}/` : `/modal/new_project/${bountyId}/`;

  $.ajax({
    url: modalUrl,
    type: 'GET',
    cache: false
  }).done(function(result) {
    $('body').append(result);
    let data = $('.team-users').data('initial') ? $('.team-users').data('initial').split(', ') : [];

    userSearch('.team-users', false, '', data, true, false);
    $('#modalProject').bootstrapModal('show');
    $('[data-toggle="tooltip"]').bootstrapTooltip();

    $('#projectForm').on('submit', function(e) {
      e.preventDefault();
      let logo = $(this)[0]['logo'].files[0];
      let formData = new FormData();
      let data = $(this).serializeArray();

      formData.append('logo', logo);

      for (let i = 0; i < data.length; i++) {
        formData.append(data[i].name, data[i].value);
      }

      const sendConfig = {
        url: '/modal/save_project/',
        method: 'POST',
        data: formData,
        processData: false,
        dataType: 'json',
        contentType: false
      };

      $.ajax(sendConfig).done(function(response) {
        if (!response.success) {
          return _alert(response.msg, 'error');
        }
        delete localStorage['pendingProject'];
        $('#modalProject').bootstrapModal('hide');
        return _alert({message: response.msg}, 'info');

      }).fail(function(data) {
        _alert(data.responseJSON['error'], 'error');
      });

    });
  });

  $(document).on('change', '#project_logo', function() {
    previewFile($(this));
  });
};

$(document, '#modalProject').on('hide.bs.modal', function(e) {
  $('#modalProject').remove();
  $('#modalProject').bootstrapModal('dispose');
});

const previewFile = function(elem) {
  let preview = document.querySelector('#img-preview');
  let file = elem[0].files[0];
  let reader = new FileReader();

  reader.onloadend = function() {
    let imageURL = reader.result;

    getImageSize(imageURL, function(imageWidth, imageHeight) {
      if (imageWidth !== imageHeight) {
        elem.val('');
        preview.src = elem.data('imgplaceholder');
        return alert('Please use a square image');
      }
      preview.src = reader.result;
    });
  };

  if (file) {
    reader.readAsDataURL(file);
  }
};

function getImageSize(imageURL, callback) {
  let image = new Image();

  image.onload = function() {
    callback(this.naturalWidth, this.naturalHeight);
  };
  image.src = imageURL;
}
